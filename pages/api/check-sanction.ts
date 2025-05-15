import type { NextApiRequest, NextApiResponse } from 'next';
import { Telegraf } from 'telegraf';

type SanctionCheckResponse = {
  isSanctioned: boolean;
  error?: string;
  details?: { category: string }[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SanctionCheckResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ isSanctioned: false, error: 'Wallet address is required.' });
  }

  // Basic Ethereum address validation (can be improved for checksum)
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ isSanctioned: false, error: 'Invalid Ethereum address format.' });
  }

  const apiKey = process.env.CHAINALYSIS_API_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!apiKey) {
    console.error('Chainalysis API key is not configured on the server.');
    return res.status(500).json({ isSanctioned: false, error: 'Server configuration error.' });
  }

  const chainalysisApiUrl = `https://public.chainalysis.com/api/v1/address/${address}`;

  try {
    const response = await fetch(chainalysisApiUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) { // Assuming 404 from Chainalysis means address not found & not sanctioned
        return res.status(200).json({ isSanctioned: false });
      }
      const errorData = await response.text();
      console.error(`Chainalysis API error: ${response.status} - ${errorData}`);
      return res.status(500).json({ isSanctioned: false, error: 'Failed to get sanction status from provider.' });
    }

    const data = await response.json();

    // According to the provided documentation:
    // Sanctioned if "identifications" array is not empty and contains an object with category: "sanctions".
    let isSanctioned = false;
    if (data.identifications && Array.isArray(data.identifications) && data.identifications.length > 0) {
      isSanctioned = data.identifications.some((id: { category: string }) => id.category === 'sanctions');
    }

    if (isSanctioned && botToken && chatId) {
      try {
        const bot = new Telegraf(botToken);
        const message = `🚨 Sanctioned Wallet Connection Attempt\n\nAddress: ${address}`;
        await bot.telegram.sendMessage(chatId, message);
        console.log('Sanction alert sent to Telegram.');
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
      }
    }

    return res.status(200).json({ isSanctioned, details: data.identifications });

  } catch (error) {
    console.error('Error calling Chainalysis API:', error);
    return res.status(500).json({ isSanctioned: false, error: 'Internal server error.' });
  }
} 