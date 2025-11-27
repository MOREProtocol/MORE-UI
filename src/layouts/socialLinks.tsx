import React from 'react';
import { SvgIcon } from '@mui/material';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TelegramIcon from '@mui/icons-material/Telegram';
import DiscordSvg from '/public/icons/discord.svg';

export interface SocialLinkDef {
  href: string;
  title: string;
  icon: React.ReactNode;
}

const iconSize = { fontSize: 24 };

const defaultSocialLinks: SocialLinkDef[] = [
  {
    href: 'https://x.com/more_defi/',
    title: 'X',
    icon: (
      <SvgIcon sx={iconSize}>
        <XIcon />
      </SvgIcon>
    ),
  },
  {
    href: 'https://discord.gg/XnU7hHQgYF',
    title: 'Discord',
    icon: (
      <SvgIcon viewBox="0 0 24 24" sx={iconSize}>
        <DiscordSvg />
      </SvgIcon>
    ),
  },
  {
    href: 'https://github.com/MOREProtocol',
    title: 'Github',
    icon: (
      <SvgIcon sx={iconSize}>
        <GitHubIcon />
      </SvgIcon>
    ),
  },
];

const flowSocialLinks: SocialLinkDef[] = [
  {
    href: 'https://x.com/flow_blockchain',
    title: 'X',
    icon: (
      <SvgIcon sx={iconSize}>
        <XIcon />
      </SvgIcon>
    ),
  },
  {
    href: 'https://www.instagram.com/flowblockchain/',
    title: 'Instagram',
    icon: (
      <SvgIcon sx={iconSize}>
        <InstagramIcon />
      </SvgIcon>
    ),
  },
  {
    href: 'https://www.youtube.com/@FlowBlockchain',
    title: 'YouTube',
    icon: (
      <SvgIcon sx={iconSize}>
        <YouTubeIcon />
      </SvgIcon>
    ),
  },
  {
    href: 'https://t.me/flow_community',
    title: 'Telegram',
    icon: (
      <SvgIcon sx={iconSize}>
        <TelegramIcon />
      </SvgIcon>
    ),
  },
  {
    href: 'https://discord.com/invite/J6fFnh2xx6',
    title: 'Discord',
    icon: (
      <SvgIcon viewBox="0 0 24 24" sx={iconSize}>
        <DiscordSvg />
      </SvgIcon>
    ),
  },
];

export const DEFAULT_SOCIAL_LINKS = defaultSocialLinks;
export const FLOW_SOCIAL_LINKS = flowSocialLinks;

export const getSocialLinks = (): SocialLinkDef[] =>
  process.env.NEXT_PUBLIC_UI_THEME === 'flow' ? FLOW_SOCIAL_LINKS : DEFAULT_SOCIAL_LINKS;


