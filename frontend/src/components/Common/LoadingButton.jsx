import React from 'react';
import { Button, CircularProgress } from '@mui/material';

const LoadingButton = ({ 
  loading, 
  disabled, 
  startIcon, 
  loadingPosition = 'center',
  children, 
  ...props 
}) => {
  const isDisabled = loading || disabled;
  
  return (
    <Button
      {...props}
      disabled={isDisabled}
      startIcon={!loading && loadingPosition === 'start' ? startIcon : null}
      endIcon={loading && loadingPosition === 'end' ? <CircularProgress size={20} color="inherit" /> : null}
    >
      {loading && loadingPosition === 'center' ? (
        <CircularProgress size={24} color="inherit" sx={{ mr: children ? 1 : 0 }} />
      ) : loading && loadingPosition === 'start' ? (
        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
      ) : startIcon && loadingPosition !== 'start' ? startIcon : null}
      
      {children}
    </Button>
  );
};

export default LoadingButton;
