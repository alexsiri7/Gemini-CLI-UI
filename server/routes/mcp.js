import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Gemini CLI command routes

// GET /api/mcp/cli/list - List MCP servers using Gemini CLI
router.get('/cli/list', async (req, res) => {
  try {
    console.log('📋 Listing MCP servers using Gemini CLI');
    
    const { spawn } = await import('child_process');
    const { promisify } = await import('util');
    const exec = promisify(spawn);
    
    const process = spawn('gemini', ['mcp', 'list'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, output: stdout, servers: parseGeminiListOutput(stdout) });
      } else {
        console.error('Gemini CLI error:', stderr);
        res.status(500).json({ error: 'Gemini CLI command failed', details: stderr });
      }
    });
    
    process.on('error', (error) => {
      console.error('Error running Gemini CLI:', error);
      res.status(500).json({ error: 'Failed to run Gemini CLI', details: error.message });
    });
  } catch (error) {
    console.error('Error listing MCP servers via CLI:', error);
    res.status(500).json({ error: 'Failed to list MCP servers', details: error.message });
  }
});

// POST /api/mcp/cli/add - Add MCP server using Gemini CLI
router.post('/cli/add', async (req, res) => {
  try {
    const { name, type = 'stdio', command, args = [], url, headers = {}, env = {} } = req.body;
    
    console.log('➕ Adding MCP server using Gemini CLI:', name);
    
    const { spawn } = await import('child_process');
    
    let cliArgs = ['mcp', 'add'];
    
    if (type === 'http') {
      cliArgs.push('--transport', 'http', name, url);
      // Add headers if provided
      Object.entries(headers).forEach(([key, value]) => {
        cliArgs.push('--header', `${key}: ${value}`);
      });
    } else if (type === 'sse') {
      cliArgs.push('--transport', 'sse', name, url);
      // Add headers if provided
      Object.entries(headers).forEach(([key, value]) => {
        cliArgs.push('--header', `${key}: ${value}`);
      });
    } else {
      // stdio (default): gemini mcp add <name> -s user <command> [args...]
      cliArgs.push(name);
      // Add environment variables
      Object.entries(env).forEach(([key, value]) => {
        cliArgs.push('-e', `${key}=${value}`);
      });
      cliArgs.push(command);
      if (args && args.length > 0) {
        cliArgs.push(...args);
      }
    }
    
    console.log('🔧 Running Gemini CLI command:', 'gemini', cliArgs.join(' '));
    
    const process = spawn('gemini', cliArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, output: stdout, message: `MCP server "${name}" added successfully` });
      } else {
        console.error('Gemini CLI error:', stderr);
        res.status(400).json({ error: 'Gemini CLI command failed', details: stderr });
      }
    });
    
    process.on('error', (error) => {
      console.error('Error running Gemini CLI:', error);
      res.status(500).json({ error: 'Failed to run Gemini CLI', details: error.message });
    });
  } catch (error) {
    console.error('Error adding MCP server via CLI:', error);
    res.status(500).json({ error: 'Failed to add MCP server', details: error.message });
  }
});

// DELETE /api/mcp/cli/remove/:name - Remove MCP server using Gemini CLI
router.delete('/cli/remove/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log('🗑️ Removing MCP server using Gemini CLI:', name);
    
    const { spawn } = await import('child_process');
    
    const process = spawn('gemini', ['mcp', 'remove', name], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, output: stdout, message: `MCP server "${name}" removed successfully` });
      } else {
        console.error('Gemini CLI error:', stderr);
        res.status(400).json({ error: 'Gemini CLI command failed', details: stderr });
      }
    });
    
    process.on('error', (error) => {
      console.error('Error running Gemini CLI:', error);
      res.status(500).json({ error: 'Failed to run Gemini CLI', details: error.message });
    });
  } catch (error) {
    console.error('Error removing MCP server via CLI:', error);
    res.status(500).json({ error: 'Failed to remove MCP server', details: error.message });
  }
});

// GET /api/mcp/cli/get/:name - Get MCP server details using Gemini CLI
router.get('/cli/get/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log('📄 Getting MCP server details using Gemini CLI:', name);
    
    const { spawn } = await import('child_process');
    
    const process = spawn('gemini', ['mcp', 'get', name], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, output: stdout, server: parseGeminiGetOutput(stdout) });
      } else {
        console.error('Gemini CLI error:', stderr);
        res.status(404).json({ error: 'Gemini CLI command failed', details: stderr });
      }
    });
    
    process.on('error', (error) => {
      console.error('Error running Gemini CLI:', error);
      res.status(500).json({ error: 'Failed to run Gemini CLI', details: error.message });
    });
  } catch (error) {
    console.error('Error getting MCP server details via CLI:', error);
    res.status(500).json({ error: 'Failed to get MCP server details', details: error.message });
  }
});

// Helper functions to parse Gemini CLI output
function parseGeminiListOutput(output) {
  const servers = [];
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Skip headers and empty lines
    if (line.includes('Configured MCP servers') || line.includes('Loaded cached credentials')) {
      continue;
    }

    if (line.includes(':')) {
      const colonIndex = line.indexOf(':');
      let name = line.substring(0, colonIndex).trim();
      
      // Remove status symbols like ✗ or ✓
      name = name.replace(/^[✗✓]\s*/, '').trim();
      
      const rest = line.substring(colonIndex + 1).trim();
      
      let type = 'stdio';
      if (rest.includes('(SSE)') || rest.includes('(sse)')) type = 'sse';
      else if (rest.includes('(HTTP)') || rest.includes('(http)')) type = 'http';
      else if (rest.startsWith('http')) type = 'http';
      
      if (name && name !== 'Configured MCP servers') {
        servers.push({
          name,
          type,
          status: line.includes('✓') ? 'active' : 'inactive'
        });
      }
    }
  }
  
  console.log('🔍 Parsed Gemini CLI servers:', servers);
  return servers;
}

function parseGeminiGetOutput(output) {
  // Parse the output from 'gemini mcp get <name>' command
  // This is a simple parser - might need adjustment based on actual output format
  try {
    // Try to extract JSON if present
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Otherwise, parse as text
    const server = { raw_output: output };
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Name:')) {
        server.name = line.split(':')[1]?.trim();
      } else if (line.includes('Type:')) {
        server.type = line.split(':')[1]?.trim();
      } else if (line.includes('Command:')) {
        server.command = line.split(':')[1]?.trim();
      } else if (line.includes('URL:')) {
        server.url = line.split(':')[1]?.trim();
      }
    }
    
    return server;
  } catch (error) {
    return { raw_output: output, parse_error: error.message };
  }
}

export default router;