import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import facets from './facets';
import { Action, Facet } from './facets/types';
import { VaultManagementActionModal } from './VaultManagementActionModal';

export const VaultManagement: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [action, setAction] = useState<Action | null>(null);
  const [facet, setFacet] = useState<Facet | null>(null);

  const handleOpenModal = (action: Action, facet: Facet) => {
    setAction(action);
    setFacet(facet);
    setIsOpen(true);
  };

  return (
    <Box sx={{ width: '100%', padding: 7 }}>
      {facets.map((facet) => (
        <Accordion key={facet.name} disabled={facet.actions.length < 1}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
              <img src={facet.icon} alt={facet.name} style={{ width: 25, height: 25 }} />
              <Typography variant="main16">{facet.name}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Box}>
              <Table sx={{ minWidth: 500 }}>
                <TableBody>
                  {facet.actions.map((action) => (
                    <TableRow
                      key={action.id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        {action.name}
                      </TableCell>
                      <TableCell align="left">{action.description}</TableCell>
                      <TableCell align="right">
                        <Button variant="outlined" onClick={() => handleOpenModal(action, facet)}>
                          <Typography noWrap variant="secondary14">
                            {action.actionButtonText}
                          </Typography>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
      <VaultManagementActionModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        action={action}
        facet={facet}
      />
    </Box>
  );
};
