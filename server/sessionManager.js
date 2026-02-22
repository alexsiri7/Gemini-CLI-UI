import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.baseTmpDir = path.join(os.homedir(), '.gemini', 'tmp');
  }

  createSession(sessionId, projectPath) {
    const session = {
      id: sessionId,
      projectPath: projectPath,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  addMessage(sessionId, role, content) {
    let session = this.sessions.get(sessionId);
    if (!session) session = this.createSession(sessionId, '');
    session.messages.push({ role, content, timestamp: new Date() });
    session.lastActivity = new Date();
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getProjectSessions(projectPath) {
    const projectName = path.basename(projectPath);
    const sessions = [];
    for (const [id, session] of this.sessions) {
      if (session.projectName === projectName) {
        sessions.push({
          id: session.id,
          summary: this.getSessionSummary(session),
          messageCount: session.messages.length,
          lastActivity: session.lastActivity
        });
      }
    }
    return sessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }

  getSessionSummary(session) {
    if (session.messages.length === 0) return 'New Session';
    const firstUser = session.messages.find(m => m.role === 'user');
    if (firstUser) {
      const text = firstUser.content;
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    return 'New Session';
  }

  async loadSessions() {
    try {
      const projectDirs = await fs.readdir(this.baseTmpDir);
      for (const project of projectDirs) {
        const chatsDir = path.join(this.baseTmpDir, project, 'chats');
        try {
          const files = await fs.readdir(chatsDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const raw = await fs.readFile(path.join(chatsDir, file), 'utf8');
              const data = JSON.parse(raw);
              const session = {
                id: data.sessionId,
                projectName: project,
                messages: [],
                createdAt: new Date(data.startTime),
                lastActivity: new Date(data.lastUpdated)
              };
              if (data.messages) {
                session.messages = data.messages
                  .filter(m => m.type === 'user' || m.type === 'gemini')
                  .map(m => ({
                    role: m.type === 'user' ? 'user' : 'assistant',
                    content: Array.isArray(m.content) ? m.content.map(c => c.text).join('\n') : m.content,
                    timestamp: new Date(m.timestamp)
                  }));
              }
              this.sessions.set(session.id, session);
            }
          }
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  getSessionMessages(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.messages.map(msg => ({
      type: 'message',
      message: { role: msg.role, content: msg.content },
      timestamp: msg.timestamp.toISOString()
    }));
  }

  buildConversationContext(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.messages.length === 0) return '';
    
    // Format messages as context
    // Skip the very last message if it's the current user prompt (though usually this is called before adding)
    return session.messages
      .map(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n') + '\n\nAssistant: ';
  }
}

const sessionManager = new SessionManager();
sessionManager.loadSessions();
export default sessionManager;
