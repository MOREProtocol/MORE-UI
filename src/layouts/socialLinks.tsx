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

const MediumIcon = () => (
  <path d="M2.846 6.887c.03-.295-.083-.586-.303-.784l-2.24-2.7v-.403h6.958l5.378 11.795 4.728-11.795H24v.403l-1.916 1.837c-.165.126-.247.333-.213.538v13.498c-.034.204.048.41.213.537l1.871 1.837v.403h-9.412v-.403l1.939-1.882c.19-.19.19-.246.19-.537V7.794L11.31 21.677h-.728L4.964 7.794v9.305c-.052.385.076.774.347 1.052l2.521 3.058v.404H.706v-.404l2.521-3.058c.27-.279.39-.67.325-1.052V6.887z" />
);

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
    href: 'https://t.me/More_Markets',
    title: 'Telegram',
    icon: (
      <SvgIcon sx={iconSize}>
        <TelegramIcon />
      </SvgIcon>
    ),
  },
  {
    href: 'https://medium.com/@more_markets',
    title: 'Medium',
    icon: (
      <SvgIcon viewBox="0 0 24 24" sx={iconSize}>
        <MediumIcon />
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


