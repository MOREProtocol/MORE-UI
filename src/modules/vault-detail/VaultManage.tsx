import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';

export const VaultManage: React.FC = () => {
  return (
    <Box sx={{ width: '100%', padding: 5 }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
            <img src={'/loveMore.svg'} alt="MORE Logo" style={{ width: 25, height: 25 }} />
            <Typography variant="main16">MORE Markets</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>MORE Markets content</Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
            <img
              src={'/icons/protocols/uniswap.svg'}
              alt="Uniswap Logo"
              style={{ width: 25, height: 25 }}
            />
            <Typography variant="main16">Uniswap v2</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>Uniswap v2 content</Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
            <img
              src={'/icons/protocols/origami.svg'}
              alt="Origami Logo"
              style={{ width: 25, height: 25 }}
            />
            <Typography variant="main16">Origami</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>Origami content</Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
            <img
              src={'/icons/protocols/morpho.svg'}
              alt="Morpho Logo"
              style={{ width: 25, height: 25 }}
            />
            <Typography variant="main16">Morpho</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>Morpho content</Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
