import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useOmniRequestStore, OmniRequest } from 'src/store/omniRequestStore';

const STATUS_LABEL: Record<OmniRequest['status'], string> = {
  pending: 'Sending cross-chain…',
  'ready-to-execute': 'Ready to execute',
  completed: 'Completed',
  refunded: 'Refunded',
};

function RequestCard({ req }: { req: OmniRequest }) {
  const removeOmniRequest = useOmniRequestStore((s) => s.removeOmniRequest);
  const isDone = req.status === 'completed' || req.status === 'refunded';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isDone ? 'success.main' : 'divider',
        borderRadius: 1,
        minWidth: 280,
      }}
    >
      {isDone ? (
        <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 20, flexShrink: 0 }} />
      ) : (
        <CircularProgress size={18} sx={{ flexShrink: 0 }} />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
          {req.type === 'deposit' ? 'Cross-chain deposit' : 'Cross-chain redeem'}
          {req.vaultName ? ` · ${req.vaultName}` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {STATUS_LABEL[req.status]}
        </Typography>
      </Box>
      {isDone && (
        <IconButton size="small" onClick={() => removeOmniRequest(req.guid)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}

export function OmniRequestNotifications() {
  const omniRequests = useOmniRequestStore((s) => s.omniRequests);
  const requests = Object.values(omniRequests);

  if (requests.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {requests.map((req) => (
        <RequestCard key={req.guid} req={req} />
      ))}
    </Box>
  );
}
