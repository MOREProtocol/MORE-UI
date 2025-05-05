import { ReactNode, useState, useEffect } from 'react';
import { sanctionedCountries } from "src/utils/const";
import { ExclamationCircleIcon } from '@heroicons/react/outline';
import { Box, SvgIcon, Typography } from '@mui/material';
import { MainLayout } from 'src/layouts/MainLayout';

import { BasicModal } from './primitives/BasicModal';
import { Link } from './primitives/Link';

export const SanctionRegion = ({ children }: { children: ReactNode }) => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  const setOpen = (_value: boolean) => { }; // ignore, we want the modal to not be dismissable
  const [sanctioned, setSanctioned] = useState(false);

  const checkRegion = async () => {
    try {
      const res = await fetch("https://get.geojs.io/v1/ip/country.json");

      if (res.ok) {
        const respData = await res.json();
        const countryInfo = respData.country;
        if (sanctionedCountries.indexOf(countryInfo) >= 0) {
          setSanctioned(true);
        } else {
          setSanctioned(false);
        }
      }
    } catch (err) {
      console.log("Can not detect the location");
    }
  };

  useEffect(() => {
    checkRegion();
  }, []);

  if (sanctioned) {
    return (
      <MainLayout>
        <BasicModal contentMaxWidth={500} open={true} withCloseButton={false} setOpen={setOpen}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <SvgIcon sx={{ fontSize: '24px', color: 'warning.main', mb: 2 }}>
              <ExclamationCircleIcon />
            </SvgIcon>
            <Typography variant="h2">
              Access Restricted
            </Typography>
            <Typography variant="description" sx={{ my: 4 }}>
              We are sorry, but our services are not available in your region at this
              time.
            </Typography>
            <Typography variant="description" sx={{ mb: 4 }}>
              If you believe this is a mistake or have any questions, please contact
              our support team at: <br />
              <Link
                href="mailto: support@more.markets"
                sx={{ fontSize: '16px', textDecoration: 'underline' }}
                color="theme.palette.text.primary"
              >
                support@more.markets
              </Link>
            </Typography>
            <Typography variant="description" sx={{ textAlign: 'left', alignSelf: 'flex-start' }}>
              Thank you for your understanding.
            </Typography>
          </Box>
        </BasicModal>
      </MainLayout>
    );
  }

  return <>{children}</>;
};
