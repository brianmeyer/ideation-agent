/**
 * Command Processor Service
 * 
 * Handles slash command processing and routing for the ideation system.
 * Supports commands like /ideate, /brainstorm, /analyze, /synthesize, /help.
 * 
 * @author Brian Meyer
 * @version 1.0.0
 */

const logger = require('../utils/logger');

class CommandProcessor {
  constructor() {
    this.commands = {
      ideate: {
        description: 'Trigger full multi-agent ideation session',
        usage: '/ideate <your idea or problem>',
        examples: ['Create a sustainable transportation solution', 'Improve remote work productivity']
      },
      brainstorm: {
        description: 'Focus on creative brainstorming and idea generation',
        usage: '/brainstorm <topic>',
        examples: ['New social media features', 'Eco-friendly packaging ideas']
      },
      analyze: {
        description: 'Analytical reasoning and problem breakdown',
        usage: '/analyze <problem or situation>',
        examples: ['Market entry strategy for new product', 'Team communication challenges']
      },
      synthesize: {
        description: 'Logical evaluation and synthesis of ideas',
        usage: '/synthesize <ideas or options>',
        examples: ['Compare these three business models', 'Evaluate pros and cons of remote work']
      },
      help: {
        description: 'Show available commands and usage examples',
        usage: '/help [command]',
        examples: ['Get general help', 'Get specific command help']
      }
    };
  }

  /**
   * Process incoming message for slash commands
   * @param {string} message - User message to process
   * @returns {Object|null} Command object or null if not a command
   */
  processMessage(message) {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage.startsWith('/')) {
      return null; // Not a command
    }

    const parts = trimmedMessage.split(' ');
    const command = parts[0].substring(1).toLowerCase(); // Remove '/' and lowercase
    const args = parts.slice(1).join(' ').trim();

    if (!this.commands[command]) {
      return {
        type: 'command',
        action: 'unknown',
        message: this.getUnknownCommandResponse(command),
        shouldTriggerIdeation: false
      };
    }

    logger.info(`Processing slash command: /${command}`, {
      args: args.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    return this.executeCommand(command, args);
  }

  /**
   * Execute a specific command
   * @param {string} command - Command name
   * @param {string} args - Command arguments
   * @returns {Object} Command execution result
   */
  executeCommand(command, args) {
    switch (command) {
      case 'help':
        return this.executeHelpCommand(args);
      
      case 'ideate':
        return this.executeIdeateCommand(args);
      
      case 'brainstorm':
        return this.executeBrainstormCommand(args);
      
      case 'analyze':
        return this.executeAnalyzeCommand(args);
      
      case 'synthesize':
        return this.executeSynthesizeCommand(args);
      
      default:
        return {
          type: 'command',
          action: command,
          message: this.getUnknownCommandResponse(command),
          shouldTriggerIdeation: false
        };
    }
  }

  /**
   * Execute /help command
   * @param {string} args - Optional specific command to get help for
   * @returns {Object} Help command result
   */
  executeHelpCommand(args) {
    if (args) {
      // Help for specific command
      const targetCommand = args.toLowerCase();
      if (this.commands[targetCommand]) {
        return {
          type: 'command',
          action: 'help',
          message: this.getSpecificCommandHelp(targetCommand),
          shouldTriggerIdeation: false
        };
      } else {
        return {
          type: 'command',
          action: 'help',
          message: `Command "${targetCommand}" not found. Use \`/help\` to see all available commands.`,
          shouldTriggerIdeation: false
        };
      }
    }

    // General help
    return {
      type: 'command',
      action: 'help',
      message: this.getGeneralHelp(),
      shouldTriggerIdeation: false
    };
  }

  /**
   * Execute /ideate command
   * @param {string} args - Ideation prompt
   * @returns {Object} Ideate command result
   */
  executeIdeateCommand(args) {
    if (!args) {
      return {
        type: 'command',
        action: 'ideate',
        message: '❌ **Missing prompt**: Please provide a topic or problem to ideate on.\n\n**Example**: `/ideate Create a sustainable transportation solution for urban areas`',
        shouldTriggerIdeation: false
      };
    }

    return {
      type: 'command',
      action: 'ideate',
      message: args,
      shouldTriggerIdeation: true,
      commandContext: {
        focusArea: 'full_ideation',
        prompt: args
      }
    };
  }

  /**
   * Execute /brainstorm command
   * @param {string} args - Brainstorming topic
   * @returns {Object} Brainstorm command result
   */
  executeBrainstormCommand(args) {
    if (!args) {
      return {
        type: 'command',
        action: 'brainstorm',
        message: '❌ **Missing topic**: Please provide a topic to brainstorm about.\n\n**Example**: `/brainstorm New features for a productivity app`',
        shouldTriggerIdeation: false
      };
    }

    return {
      type: 'command',
      action: 'brainstorm',
      message: `Focus on creative brainstorming: ${args}`,
      shouldTriggerIdeation: true,
      commandContext: {
        focusArea: 'creative_focus',
        prompt: args
      }
    };
  }

  /**
   * Execute /analyze command
   * @param {string} args - Analysis subject
   * @returns {Object} Analyze command result
   */
  executeAnalyzeCommand(args) {
    if (!args) {
      return {
        type: 'command',
        action: 'analyze',
        message: '❌ **Missing subject**: Please provide something to analyze.\n\n**Example**: `/analyze The challenges of implementing remote work policies`',
        shouldTriggerIdeation: false
      };
    }

    return {
      type: 'command',
      action: 'analyze',
      message: `Provide analytical reasoning for: ${args}`,
      shouldTriggerIdeation: true,
      commandContext: {
        focusArea: 'reasoning_focus',
        prompt: args
      }
    };
  }

  /**
   * Execute /synthesize command
   * @param {string} args - Ideas or options to synthesize
   * @returns {Object} Synthesize command result
   */
  executeSynthesizeCommand(args) {
    if (!args) {
      return {
        type: 'command',
        action: 'synthesize',
        message: '❌ **Missing content**: Please provide ideas or options to synthesize.\n\n**Example**: `/synthesize Compare the pros and cons of these three business models: SaaS, marketplace, and subscription`',
        shouldTriggerIdeation: false
      };
    }

    return {
      type: 'command',
      action: 'synthesize',
      message: `Provide logical evaluation and synthesis of: ${args}`,
      shouldTriggerIdeation: true,
      commandContext: {
        focusArea: 'logical_focus',
        prompt: args
      }
    };
  }

  /**
   * Get general help message
   * @returns {string} General help content
   */
  getGeneralHelp() {
    const helpSections = [
      '# 🚀 Ideation Agent Commands\n',
      'Use these slash commands to trigger different types of AI-powered ideation:\n'
    ];

    // Add each command
    Object.entries(this.commands).forEach(([cmd, info]) => {
      helpSections.push(`## /${cmd}`);
      helpSections.push(`**${info.description}**`);
      helpSections.push(`Usage: \`${info.usage}\``);
      
      if (info.examples?.length > 0) {
        helpSections.push('Examples:');
        info.examples.forEach(example => {
          helpSections.push(`• \`/${cmd} ${example}\``);
        });
      }
      helpSections.push(''); // Empty line
    });

    helpSections.push('---');
    helpSections.push('💡 **Tip**: Use `/help <command>` for detailed help on a specific command.');
    helpSections.push('🤖 **Note**: All commands trigger AI agents that work together to provide comprehensive responses.');

    return helpSections.join('\n');
  }

  /**
   * Get help for a specific command
   * @param {string} command - Command name
   * @returns {string} Specific command help
   */
  getSpecificCommandHelp(command) {
    const info = this.commands[command];
    if (!info) return 'Command not found.';

    const sections = [
      `# /${command} Command\n`,
      `**${info.description}**\n`,
      `**Usage**: \`${info.usage}\`\n`
    ];

    if (info.examples?.length > 0) {
      sections.push('**Examples**:');
      info.examples.forEach(example => {
        sections.push(`• \`/${command} ${example}\``);
      });
      sections.push('');
    }

    // Add command-specific details
    const details = this.getCommandDetails(command);
    if (details) {
      sections.push('**Details**:');
      sections.push(details);
    }

    return sections.join('\n');
  }

  /**
   * Get detailed information about a specific command
   * @param {string} command - Command name
   * @returns {string} Command details
   */
  getCommandDetails(command) {
    const details = {
      ideate: 'Triggers all three AI agents (Creative 💡, Reasoning 🧠, Logical ⚖️) to collaborate on your prompt. This provides the most comprehensive response with multiple perspectives.',
      
      brainstorm: 'Emphasizes the Creative agent while still including analytical perspectives. Best for generating innovative ideas and exploring possibilities.',
      
      analyze: 'Focuses on the Reasoning agent for systematic analysis. Use this for breaking down complex problems and understanding relationships.',
      
      synthesize: 'Prioritizes the Logical agent for evaluation and synthesis. Perfect for comparing options, weighing trade-offs, and making decisions.',
      
      help: 'Provides information about available commands and their usage. No AI agents are triggered for help commands.'
    };

    return details[command] || null;
  }

  /**
   * Get response for unknown command
   * @param {string} command - Unknown command name
   * @returns {string} Unknown command response
   */
  getUnknownCommandResponse(command) {
    return `❌ **Unknown command**: \`/${command}\`

Did you mean one of these?
${Object.keys(this.commands).map(cmd => `• \`/${cmd}\``).join('\n')}

Use \`/help\` to see all available commands and examples.`;
  }

  /**
   * Get list of available commands
   * @returns {Array<string>} Array of command names
   */
  getAvailableCommands() {
    return Object.keys(this.commands);
  }

  /**
   * Check if a string is a valid command
   * @param {string} command - Command to check (without /)
   * @returns {boolean} Is valid command
   */
  isValidCommand(command) {
    return this.commands.hasOwnProperty(command.toLowerCase());
  }

  /**
   * Get command info
   * @param {string} command - Command name
   * @returns {Object|null} Command information or null
   */
  getCommandInfo(command) {
    return this.commands[command.toLowerCase()] || null;
  }
}

module.exports = CommandProcessor;