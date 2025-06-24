import { NextApiRequest, NextApiResponse } from 'next';
import { Telegraf } from 'telegraf';

interface WhitelistNotificationRequest {
  vaultId: string;
  walletAddress: string;
  contactInfo?: string | null;
}

const vaultMapping = {
  // SafeYields
  "0xDB822963f9d0C4D62e20a06977Be0B9CA6CAFE62": {
    "chatId": ""
  },
  // TAU
  "0x0000000000000000000000000000000000000000": {
    "chatId": ""
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vaultId, walletAddress, contactInfo }: WhitelistNotificationRequest = req.body;

    if (!vaultId || !walletAddress) {
      return res.status(400).json({ message: 'vaultId and walletAddress are required' });
    }

    // Validate wallet address format (basic Ethereum address validation)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ message: 'Invalid wallet address format' });
    }

    // Validate contact info length to prevent extremely long messages
    if (contactInfo && contactInfo.length > 500) {
      return res.status(400).json({ message: 'Contact info too long (max 500 characters)' });
    }

    // Get the chat ID for the vault
    const vaultConfig = vaultMapping[vaultId as keyof typeof vaultMapping];
    if (!vaultConfig) {
      return res.status(404).json({ message: 'Vault not found in mapping' });
    }

    const { chatId } = vaultConfig;

    // Log the notification request
    console.log('Whitelist notification request:', {
      vaultId,
      walletAddress,
      contactInfo,
      chatId,
      timestamp: new Date().toISOString()
    });

    // Send Telegram notification if bot token and chat ID are available
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Function to escape Telegram markdown special characters
    const escapeMarkdown = (text: string): string => {
      return text.replace(/[_*\[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    // More lenient escaping for contact info (emails/telegram handles)
    const escapeContactInfo = (text: string): string => {
      // Only escape characters that would break markdown, but preserve email/telegram valid chars
      // Keep: @ . + - _ (needed for emails and telegram handles)
      return text.replace(/[*\[\]()~`>#=|{}!]/g, '\\$&');
    };

    if (botToken && chatId) {
      const bot = new Telegraf(botToken);
      try {

        // Sanitize inputs to prevent markdown injection
        const sanitizedWalletAddress = escapeMarkdown(walletAddress);
        const sanitizedVaultId = escapeMarkdown(vaultId);
        const sanitizedContactInfo = contactInfo ? escapeContactInfo(contactInfo) : null;

        // Format the contact info part of the message
        const contactInfoText = sanitizedContactInfo
          ? `Contact info: ${sanitizedContactInfo}`
          : 'No contact info provided';

        // Create the message with escaped content
        const message = `🔐 Whitelist Request\n\nWallet ${sanitizedWalletAddress} is requesting to deposit in the vault \`${sanitizedVaultId}\`\.\n\n${contactInfoText}`;

        // Send the message with MarkdownV2 parse mode for better security
        await bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'MarkdownV2'
        });
        console.log('Whitelist notification sent to Telegram.');

      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
        await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, "Error sending telegram notification to curators");
        // Don't fail the API call if Telegram fails, just log the error
      }
    } else {
      console.log('Telegram bot token or chat ID not configured for this vault');
    }

    return res.status(200).json({
      message: 'Whitelist notification request submitted successfully',
      success: true
    });

  } catch (error) {
    console.error('Error processing whitelist notification:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}