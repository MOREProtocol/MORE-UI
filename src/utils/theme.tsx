import {
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
} from '@heroicons/react/outline';
import { SvgIcon, Theme, ThemeOptions } from '@mui/material';
import { createTheme } from '@mui/material/styles';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ColorPartial } from '@mui/material/styles/createPalette';
import React from 'react';

const theme = createTheme();
const {
  typography: { pxToRem },
} = theme;

export const FONT_DISPLAY = '"General Sans", "Inter", system-ui, sans-serif';
export const FONT_BODY = '"Inter", system-ui, sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

declare module '@mui/material/styles/createPalette' {
  interface PaletteColor extends ColorPartial {}

  interface TypeText {
    muted: string;
  }

  interface TypeBackground {
    default: string;
    paper: string;
    surface: string;
    surface2: string;
    surface3: string;
    bg: string;
    header: string;
    disabled: string;
  }

  interface Palette {
    gradients: {
      moreGradient: string;
      newGradient: string;
      flowBackgroundLight: string;
      flowBackgroundDark: string;
    };
    other: {
      standardInputLine: string;
      chartHighlight: string;
    };
  }

  interface PaletteOptions {
    other?: {
      standardInputLine?: string;
      chartHighlight?: string;
    };
    gradients?: {
      moreGradient?: string;
      newGradient?: string;
      flowBackgroundLight?: string;
      flowBackgroundDark?: string;
    };
  }
}

interface TypographyCustomVariants {
  display1: React.CSSProperties;
  subheader1: React.CSSProperties;
  subheader2: React.CSSProperties;
  description: React.CSSProperties;
  buttonL: React.CSSProperties;
  buttonM: React.CSSProperties;
  buttonS: React.CSSProperties;
  helperText: React.CSSProperties;
  tooltip: React.CSSProperties;
  main40: React.CSSProperties;
  main25: React.CSSProperties;
  secondary25: React.CSSProperties;
  main21: React.CSSProperties;
  secondary21: React.CSSProperties;
  main19: React.CSSProperties;
  secondary19: React.CSSProperties;
  main16: React.CSSProperties;
  secondary16: React.CSSProperties;
  main14: React.CSSProperties;
  secondary14: React.CSSProperties;
  main12: React.CSSProperties;
  secondary12: React.CSSProperties;
}

declare module '@mui/material/styles' {
  interface TypographyVariants extends TypographyCustomVariants {}

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions extends TypographyCustomVariants {}

  interface BreakpointOverrides {
    xsm: true;
    xxl: true;
    mdlg: true;
  }
}

// Update the Typography's variant prop options
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display1: true;
    subheader1: true;
    subheader2: true;
    description: true;
    buttonL: true;
    buttonM: true;
    buttonS: true;
    helperText: true;
    tooltip: true;
    main40: true;
    main25: true;
    secondary25: true;
    main21: true;
    secondary21: true;
    main19: true;
    secondary19: true;
    main16: true;
    secondary16: true;
    main14: true;
    secondary14: true;
    main12: true;
    secondary12: true;
    h5: false;
    h6: false;
    subtitle1: false;
    subtitle2: false;
    body1: false;
    body2: false;
    button: false;
    overline: false;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    surface: true;
    gradient: true;
  }
}

export const getDesignTokens = (mode: 'light' | 'dark') => {
  const getColor = (lightColor: string, darkColor: string) =>
    mode === 'dark' ? darkColor : lightColor;

  // Brand orange is the only control accent (light #F59042 / dark #FFA15A).
  const brand = getColor('#F59042', '#FFA15A');
  // Surface ramp from the design tokens: surface < card-soft (surface/2) < surface3.
  const line = getColor('#ECEAE3', '#27231E');
  const faint = getColor('#716C66', '#8D8880');

  return {
    breakpoints: {
      keys: ['xs', 'xsm', 'sm', 'md', 'lg', 'xl', 'xxl'],
      values: { xs: 0, xsm: 640, sm: 760, md: 960, mdlg: 1125, lg: 1280, xl: 1575, xxl: 1800 },
    },
    palette: {
      mode,
      primary: {
        main: brand,
        light: '#FFB071',
        dark: getColor('#E5732A', '#FFB47A'),
        contrast: '#FFFFFF',
      },
      secondary: {
        main: getColor('#605C55', '#A8A29A'),
        light: getColor('#8D8880', '#C4BEB4'),
        dark: getColor('#4A4740', '#8D8880'),
      },
      error: {
        main: '#B91C1C',
        light: getColor('#D66A6A', '#E57373'),
        dark: getColor('#8F1515', '#7F1D1D'),
        '100': getColor('#B91C1C', '#FCA5A5'), // for alert text
        '200': getColor('#FBEAEA', '#2E0C0A'), // for alert background
      },
      warning: {
        main: '#F59E0B',
        light: getColor('#FBBF4D', '#FFB74D'),
        dark: '#B45309',
        '100': getColor('#B45309', '#FCD9A0'), // for alert text
        '200': getColor('#FEF6E7', '#2A1D04'), // for alert background
      },
      info: {
        main: getColor('#1F6E8C', '#4FC3F7'),
        light: getColor('#4A97B3', '#4FC3F7'),
        dark: getColor('#155066', '#0288D1'),
        '100': getColor('#155066', '#A9E2FB'), // for alert text
        '200': getColor('#E7F1F5', '#071F2E'), // for alert background
      },
      success: {
        main: '#22C55E',
        light: getColor('#5FD98A', '#66BB6A'),
        dark: '#15803D',
        '100': getColor('#15803D', '#A6E9BE'), // for alert text
        '200': getColor('#EAF8EF', '#0A1F12'), // for alert background
      },
      text: {
        primary: getColor('#1A1714', '#F5F1EA'),
        secondary: getColor('#605C55', '#A8A29A'),
        disabled: getColor('#B5B0A8', '#5A554E'),
        muted: faint,
        highlight: brand,
      },
      background: {
        default: getColor('#FBFAF7', '#0E0D0B'), // surface
        surface: getColor('#F6F4EE', '#1F1C18'), // card-soft
        surface2: getColor('#F6F4EE', '#1F1C18'), // card-soft
        surface3: getColor('#EFECE4', '#26221D'),
        bg: getColor('#FBFAF7', '#0E0D0B'), // surface
        paper: getColor('#FFFFFF', '#181613'), // card
        header: getColor('#FFFFFF', '#181613'), // white (light) / card (dark) — mockup header
        disabled: line,
      },
      divider: line,
      action: {
        active: getColor('#605C55', '#A8A29A'),
        hover: 'rgba(245, 144, 66, 0.08)',
        selected: 'rgba(245, 144, 66, 0.12)',
        disabled: faint,
        disabledBackground: line,
        focus: 'rgba(245, 144, 66, 0.12)',
      },
      other: {
        standardInputLine: line,
        chartHighlight: brand,
      },
      gradients: {
        moreGradient: 'linear-gradient(90deg, #F59042 0%, #E5732A 100%)',
        newGradient: 'linear-gradient(90deg, #F59042 0%, #E5732A 100%)',
        // Radial flow gradient retired; keys kept as plain surface colors.
        flowBackgroundLight: '#FBFAF7',
        flowBackgroundDark: '#0E0D0B',
      },
    },
    spacing: 4,
    typography: {
      fontFamily: FONT_BODY,
      h5: undefined,
      h6: undefined,
      subtitle1: undefined,
      subtitle2: undefined,
      body1: undefined,
      body2: undefined,
      button: undefined,
      overline: undefined,
      display1: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        fontSize: pxToRem(40),
      },
      h1: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
        fontSize: pxToRem(28),
      },
      h2: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
        fontSize: pxToRem(21),
      },
      h3: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.3,
        fontSize: pxToRem(18),
      },
      h4: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.4,
        fontSize: pxToRem(16),
      },
      subheader1: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        letterSpacing: pxToRem(0.15),
        lineHeight: pxToRem(24),
        fontSize: pxToRem(16),
      },
      subheader2: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        letterSpacing: pxToRem(0.1),
        lineHeight: pxToRem(20),
        fontSize: pxToRem(14),
      },
      description: {
        fontFamily: FONT_BODY,
        fontWeight: 400,
        letterSpacing: pxToRem(0.15),
        lineHeight: pxToRem(22),
        fontSize: pxToRem(14),
      },
      caption: {
        fontFamily: FONT_BODY,
        fontWeight: 400,
        letterSpacing: pxToRem(0.15),
        lineHeight: pxToRem(16),
        fontSize: pxToRem(12),
      },
      buttonL: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        letterSpacing: pxToRem(0.46),
        lineHeight: pxToRem(24),
        fontSize: pxToRem(16),
      },
      buttonM: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        lineHeight: pxToRem(20),
        fontSize: pxToRem(14),
      },
      buttonS: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        letterSpacing: pxToRem(0.46),
        lineHeight: pxToRem(16),
        fontSize: pxToRem(12),
      },
      helperText: {
        fontFamily: FONT_BODY,
        fontWeight: 400,
        letterSpacing: pxToRem(0.4),
        lineHeight: pxToRem(16),
        fontSize: pxToRem(12),
      },
      tooltip: {
        fontFamily: FONT_BODY,
        fontWeight: 400,
        letterSpacing: pxToRem(0.15),
        lineHeight: pxToRem(16),
        fontSize: pxToRem(12),
      },
      // Numeric-display variants — JetBrains Mono per design ("all numerics in mono").
      // main* = weight 600, secondary* = weight 500.
      main40: {
        fontFamily: FONT_MONO,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: pxToRem(40),
      },
      main25: {
        fontFamily: FONT_MONO,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: pxToRem(25),
      },
      secondary25: {
        fontFamily: FONT_MONO,
        fontWeight: 500,
        lineHeight: 1.2,
        fontSize: pxToRem(25),
      },
      main21: {
        fontFamily: FONT_MONO,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: pxToRem(21),
      },
      secondary21: {
        fontFamily: FONT_MONO,
        fontWeight: 500,
        lineHeight: 1.2,
        fontSize: pxToRem(21),
      },
      main19: {
        fontFamily: FONT_MONO,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: pxToRem(19),
      },
      secondary19: {
        fontFamily: FONT_MONO,
        fontWeight: 500,
        lineHeight: 1.2,
        fontSize: pxToRem(19),
      },
      main16: {
        fontFamily: FONT_MONO,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: pxToRem(16),
      },
      secondary16: {
        fontFamily: FONT_MONO,
        fontWeight: 500,
        lineHeight: 1.2,
        fontSize: pxToRem(16),
      },
      main14: {
        fontFamily: FONT_MONO,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: pxToRem(14),
      },
      secondary14: {
        fontFamily: FONT_MONO,
        fontWeight: 500,
        lineHeight: 1.2,
        fontSize: pxToRem(14),
      },
      main12: {
        fontFamily: FONT_MONO,
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: pxToRem(12),
      },
      secondary12: {
        fontFamily: FONT_MONO,
        fontWeight: 500,
        lineHeight: 1.2,
        fontSize: pxToRem(12),
      },
    },
  } as ThemeOptions;
};

export function getThemedComponents(theme: Theme) {
  const focusRing = '0 0 0 3px rgba(245, 144, 66, 0.15)';
  const shadowSoft =
    theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.4)'
      : '0 8px 32px rgba(20, 15, 8, 0.06)';

  return {
    components: {
      MuiSkeleton: {
        styleOverrides: {
          root: {
            transform: 'unset',
            backgroundColor: theme.palette.background.surface,
            borderRadius: '8px',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: '14px',
            backgroundColor: theme.palette.background.surface,
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
            '&:not(.MuiInputBase-multiline):not(.MuiInputBase-sizeSmall)': {
              height: '48px',
            },
            '&.MuiInputBase-sizeSmall': {
              borderRadius: '12px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.divider,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.text.muted,
            },
            '&.Mui-focused': {
              boxShadow: focusRing,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
              borderWidth: '1px',
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            color: theme.palette.primary.main,
            '& .MuiSlider-thumb': {
              color: theme.palette.common.white,
              border: `2px solid ${theme.palette.primary.main}`,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: focusRing,
              },
            },
            '& .MuiSlider-track': {
              color: theme.palette.primary.main,
              border: 'none',
            },
            '& .MuiSlider-rail': {
              color: theme.palette.divider,
              opacity: 1,
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: '9999px',
            textTransform: 'none',
            fontFamily: FONT_BODY,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: 'none',
            transition:
              'background-color 150ms ease, color 150ms ease, border-color 150ms ease, transform 100ms ease',
            '&:hover': {
              boxShadow: 'none',
            },
            '&.Mui-focusVisible': {
              boxShadow: 'none',
            },
            '&:active': {
              boxShadow: 'none',
              transform: 'scale(0.98)',
            },
          },
          containedPrimary: {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.common.white,
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: theme.palette.primary.dark,
            },
          },
          outlined: {
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.background.paper,
            '&:hover': {
              border: '1px solid var(--brand-300)',
              backgroundColor: theme.palette.background.paper,
            },
          },
          text: {
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
              color: theme.palette.text.primary,
            },
          },
          sizeLarge: {
            ...theme.typography.buttonL,
            minHeight: '56px',
            padding: '0 28px',
          },
          sizeMedium: {
            ...theme.typography.buttonM,
            minHeight: '48px',
            padding: '0 24px',
          },
          sizeSmall: {
            ...theme.typography.buttonS,
            minHeight: '40px',
            padding: '0 18px',
          },
        },
        variants: [
          {
            props: { variant: 'surface' },
            style: {
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.surface,
              '&:hover, &.Mui-focusVisible': {
                backgroundColor: theme.palette.background.surface3,
              },
            },
          },
          {
            props: { variant: 'gradient' },
            style: {
              color: theme.palette.common.white,
              background: theme.palette.gradients.newGradient,
              transition: 'all 0.2s ease',
              '&:hover, &.Mui-focusVisible': {
                background: theme.palette.gradients.newGradient,
                opacity: '0.9',
              },
              '&:disabled': {
                background: theme.palette.background.surface,
                color: theme.palette.text.disabled,
              },
            },
          },
        ],
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: theme.palette.background.surface,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '14px',
            padding: '4px',
          },
          grouped: {
            border: 0,
            borderRadius: '10px',
            '&:not(:first-of-type)': {
              borderRadius: '10px',
              marginLeft: '4px',
            },
            '&:first-of-type': {
              borderRadius: '10px',
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            border: 0,
            borderRadius: '10px',
            textTransform: 'none',
            fontFamily: FONT_BODY,
            fontWeight: 500,
            color: theme.palette.text.secondary,
            transition: 'color 150ms ease, background-color 150ms ease',
            '&:hover': {
              backgroundColor: 'transparent',
              color: theme.palette.text.primary,
            },
            '&.Mui-selected, &.Mui-selected:hover': {
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              fontWeight: 600,
              boxShadow: shadowSoft,
            },
            // Tx-modal type selectors disable the active option; keep its label legible.
            '&.Mui-selected.Mui-disabled': {
              color: theme.palette.text.primary,
            },
          },
        },
      },
      MuiButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: '9999px',
            overflow: 'hidden',
          },
          grouped: {
            borderRadius: 0,
            borderColor: 'transparent',
          },
          groupedOutlined: {
            borderColor: 'transparent',
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
              borderColor: 'transparent',
              color: theme.palette.text.primary,
            },
          },
          groupedContained: {
            backgroundColor: theme.palette.action.selected,
            color: theme.palette.text.primary,
            '&:hover': {
              backgroundColor: theme.palette.action.selected,
              color: theme.palette.text.primary,
            },
          },
        },
      },
      MuiTypography: {
        defaultProps: {
          variant: 'description',
          variantMapping: {
            display1: 'h1',
            h1: 'h1',
            h2: 'h2',
            h3: 'h3',
            h4: 'h4',
            subheader1: 'p',
            subheader2: 'p',
            caption: 'p',
            description: 'p',
            buttonL: 'p',
            buttonM: 'p',
            buttonS: 'p',
            main12: 'p',
            main14: 'p',
            main16: 'p',
            main19: 'p',
            main21: 'p',
            main40: 'p',
            secondary12: 'p',
            secondary14: 'p',
            secondary16: 'p',
            secondary19: 'p',
            secondary21: 'p',
            helperText: 'span',
            tooltip: 'span',
          },
        },
      },
      MuiLink: {
        defaultProps: {
          variant: 'description',
        },
      },
      MuiMenu: {
        defaultProps: {
          PaperProps: {
            elevation: 0,
            variant: 'outlined',
            style: {
              minWidth: 240,
              marginTop: '4px',
            },
          },
        },
        styleOverrides: {
          paper: {
            boxShadow: shadowSoft,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
            borderRadius: '16px',
          },
        },
      },
      MuiList: {
        styleOverrides: {
          root: {
            '.MuiMenuItem-root+.MuiDivider-root, .MuiDivider-root': {
              marginTop: '4px',
              marginBottom: '4px',
            },
          },
          padding: {
            paddingTop: '4px',
            paddingBottom: '4px',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            padding: '12px 16px',
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          root: {
            ...theme.typography.subheader1,
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: theme.palette.text.secondary,
            minWidth: 'unset !important',
            marginRight: '12px',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            marginTop: 0,
            marginBottom: 0,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: '16px',
          },
          elevation0: {
            boxShadow: 'none',
          },
          elevation1: {
            boxShadow: shadowSoft,
          },
        },
        variants: [
          {
            props: { variant: 'outlined' },
            style: {
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: 'none',
              background: theme.palette.background.paper,
            },
          },
          {
            props: { variant: 'elevation' },
            style: {
              border: `1px solid ${theme.palette.divider}`,
            },
          },
        ],
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingBottom: '39px',
            [theme.breakpoints.up('xs')]: {
              paddingLeft: '8px',
              paddingRight: '8px',
            },
            [theme.breakpoints.up('xsm')]: {
              paddingLeft: '20px',
              paddingRight: '20px',
            },
            [theme.breakpoints.up('sm')]: {
              paddingLeft: '48px',
              paddingRight: '48px',
            },
            [theme.breakpoints.up('md')]: {
              paddingLeft: '96px',
              paddingRight: '96px',
            },
            [theme.breakpoints.up('lg')]: {
              paddingLeft: '20px',
              paddingRight: '20px',
            },
            [theme.breakpoints.up('xl')]: {
              maxWidth: 'unset',
              paddingLeft: '96px',
              paddingRight: '96px',
            },
            [theme.breakpoints.up('xxl')]: {
              paddingLeft: 0,
              paddingRight: 0,
              maxWidth: '1440px',
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            height: 20 + 6 * 2,
            width: 34 + 6 * 2,
            padding: 6,
          },
          sizeSmall: {
            height: 24,
            width: 40,
            padding: 4,
            '& .MuiSwitch-switchBase': {
              padding: 4,
              '&.Mui-checked': {
                transform: 'translateX(16px)',
              },
            },
            '& .MuiSwitch-thumb': {
              transform: 'translateY(1.5px) translateX(1.5px)',
              width: '13px',
              height: '13px',
              borderRadius: '50%',
            },
            '& .MuiSwitch-track': {
              borderRadius: '9999px',
            },
          },
          switchBase: {
            padding: 8,
            '&.Mui-checked': {
              transform: 'translateX(14px)',
              '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
                opacity: 1,
              },
            },
            '&.Mui-disabled': {
              opacity: theme.palette.mode === 'dark' ? 0.3 : 0.7,
            },
          },
          thumb: {
            color: theme.palette.common.white,
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            boxShadow: '0 2px 6px rgba(20, 15, 8, 0.15)',
          },
          track: {
            opacity: 1,
            backgroundColor: theme.palette.divider,
            borderRadius: '9999px',
            transition: 'background-color 200ms ease',
          },
        },
      },
      MuiIcon: {
        variants: [
          {
            props: { fontSize: 'large' },
            style: {
              fontSize: pxToRem(32),
            },
          },
        ],
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: theme.palette.divider,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 12px',
            ...theme.typography.caption,
            alignItems: 'flex-start',
            '.MuiAlert-message': {
              padding: 0,
              paddingTop: '2px',
              paddingBottom: '2px',
            },
            '.MuiAlert-icon': {
              padding: 0,
              opacity: 1,
              '.MuiSvgIcon-root': {
                fontSize: pxToRem(20),
              },
            },
            a: {
              ...theme.typography.caption,
              fontWeight: 500,
              textDecoration: 'underline',
              '&:hover': {
                textDecoration: 'none',
              },
            },
            '.MuiButton-text': {
              ...theme.typography.caption,
              fontWeight: 500,
              textDecoration: 'underline',
              padding: 0,
              margin: 0,
              minWidth: 'unset',
              '&:hover': {
                textDecoration: 'none',
                background: 'transparent',
              },
            },
          },
        },
        defaultProps: {
          iconMapping: {
            error: (
              <SvgIcon color="error">
                <ExclamationIcon />
              </SvgIcon>
            ),
            info: (
              <SvgIcon color="info">
                <InformationCircleIcon />
              </SvgIcon>
            ),
            success: (
              <SvgIcon color="success">
                <CheckCircleIcon />
              </SvgIcon>
            ),
            warning: (
              <SvgIcon color="warning">
                <ExclamationCircleIcon />
              </SvgIcon>
            ),
          },
        },
        variants: [
          {
            props: { severity: 'error' },
            style: {
              color: theme.palette.error['100'],
              background: theme.palette.error['200'],
              a: {
                color: theme.palette.error['100'],
              },
              '.MuiButton-text': {
                color: theme.palette.error['100'],
              },
            },
          },
          {
            props: { severity: 'info' },
            style: {
              color: theme.palette.info['100'],
              background: theme.palette.info['200'],
              a: {
                color: theme.palette.info['100'],
              },
              '.MuiButton-text': {
                color: theme.palette.info['100'],
              },
            },
          },
          {
            props: { severity: 'success' },
            style: {
              color: theme.palette.success['100'],
              background: theme.palette.success['200'],
              a: {
                color: theme.palette.success['100'],
              },
              '.MuiButton-text': {
                color: theme.palette.success['100'],
              },
            },
          },
          {
            props: { severity: 'warning' },
            style: {
              color: theme.palette.warning['100'],
              background: theme.palette.warning['200'],
              a: {
                color: theme.palette.warning['100'],
              },
              '.MuiButton-text': {
                color: theme.palette.warning['100'],
              },
            },
          },
        ],
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: FONT_BODY,
            fontWeight: 400,
            fontSize: pxToRem(14),
            minWidth: '375px',
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
            '> div:first-of-type': {
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          colorPrimary: {
            color: theme.palette.primary.main,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: theme.palette.text.primary,
            color: theme.palette.background.default,
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: pxToRem(12),
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(20, 15, 8, 0.15)',
          },
          arrow: {
            color: theme.palette.text.primary,
          },
        },
      },
      MuiSelect: {
        defaultProps: {
          IconComponent: (props) => (
            <SvgIcon sx={{ fontSize: '16px' }} {...props}>
              <ChevronDownIcon />
            </SvgIcon>
          ),
        },
        styleOverrides: {
          outlined: {
            backgroundColor: 'transparent',
            ...theme.typography.buttonM,
            fontWeight: 500,
            padding: '6px 28px 6px 14px',
            color: theme.palette.text.primary,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: '6px',
            borderRadius: '9999px',
            backgroundColor: theme.palette.divider,
          },
          bar: {
            borderRadius: '9999px',
            backgroundColor: theme.palette.primary.main,
          },
          bar1Indeterminate: {
            background: theme.palette.gradients.newGradient,
          },
          bar2Indeterminate: {
            background: theme.palette.gradients.newGradient,
          },
        },
      },
    },
  } as ThemeOptions;
}
