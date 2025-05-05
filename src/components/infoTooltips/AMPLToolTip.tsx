import { ExclamationIcon } from '@heroicons/react/outline';
import { SvgIcon } from '@mui/material';

import { ContentWithTooltip } from '../ContentWithTooltip';
import { AMPLWarning } from '../Warnings/AMPLWarning';

export const AMPLToolTip = () => {
  return (
    <ContentWithTooltip tooltipContent={<AMPLWarning />}>
      <SvgIcon sx={{ fontSize: '20px', color: 'warning.main', ml: 2 }}>
        <ExclamationIcon />
      </SvgIcon>
    </ContentWithTooltip>
  );
};
