import { ReactNode, useState, useEffect } from 'react';
import { sanctionedCountries } from "src/utils/const";
import { ExclamationCircleIcon } from '@heroicons/react/outline';
import { Box, SvgIcon, Typography, Button, Checkbox, FormControlLabel } from '@mui/material';
import { BasicModal } from './primitives/BasicModal';
import { Link } from './primitives/Link';

export const SanctionRegion = ({ children }: { children: ReactNode }) => {
  const [isRegionSanctioned, setIsRegionSanctioned] = useState(false);
  const [userHasGivenConsent, setUserHasGivenConsent] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('geoRegionConsent') === 'true';
    }
    return false;
  });
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);

  const checkRegion = async () => {
    try {
      const res = await fetch("https://get.geojs.io/v1/ip/country.json");
      if (res.ok) {
        const respData = await res.json();
        const countryInfo = respData.country;
        if (sanctionedCountries.indexOf(countryInfo) >= 0) {
          setIsRegionSanctioned(true);
        } else {
          setIsRegionSanctioned(false);
        }
      } else {
        // If API fails, assume not sanctioned to avoid blocking unnecessarily
        setIsRegionSanctioned(false);
      }
    } catch (err) {
      console.log("Cannot detect the location, assuming not sanctioned.", err);
      // If fetch fails, assume not sanctioned
      setIsRegionSanctioned(false);
    }
  };

  useEffect(() => {
    // Only check region if consent hasn't already been given
    if (!userHasGivenConsent) {
      checkRegion();
    }
  }, [userHasGivenConsent]);

  const handleAgreeAndContinue = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('geoRegionConsent', 'true');
    }
    setUserHasGivenConsent(true);
  };

  const showModal = isRegionSanctioned && !userHasGivenConsent;

  if (showModal) {
    return (
      <BasicModal
        contentMaxWidth={550}
        open={true} // Modal is shown based on the showModal flag
        withCloseButton={false}
        setOpen={() => undefined}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2, // Added padding for better spacing
          }}
        >
          <SvgIcon sx={{ fontSize: '32px', color: 'warning.main', mb: 2 }}>
            <ExclamationCircleIcon />
          </SvgIcon>
          <Typography variant="h2" sx={{ mb: 2 }}>
            Access Restricted
          </Typography>
          <Typography variant="description" sx={{ textAlign: 'center', mb: 3 }}>
            It appears you are accessing this application from a region where its use may be restricted.
            By proceeding, you acknowledge that you are solely responsible for complying with all applicable local laws and regulations, and you agree to our <Link
              href="https://docs.more.markets/terms"
              target="_blank" // Open in new tab
              rel="noopener noreferrer" // Security best practice for target="_blank"
              sx={{
                textDecoration: 'underline',
                color: 'primary.main', // Or theme.palette.text.primary if you prefer
                '&:hover': {
                  textDecoration: 'none',
                }
              }}
            >
              Terms of Use
            </Link>
            .
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={isCheckboxChecked}
                onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                name="agreeTerms"
                color="primary"
              />
            }
            label="I acknowledge and agree to the terms of use."
            sx={{ mb: 3 }}
          />
          <Button
            variant="contained"
            color="primary"
            disabled={!isCheckboxChecked}
            onClick={handleAgreeAndContinue}
            fullWidth
          >
            Continue
          </Button>
        </Box>
      </BasicModal>
    );
  }

  return <>{children}</>;
};
