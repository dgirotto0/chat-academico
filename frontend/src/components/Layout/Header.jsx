import React from 'react';
import { 
  AppBar, Toolbar, Typography, IconButton, 
  Box, Menu, MenuItem, Tooltip, Badge,
  useTheme
} from '@mui/material';
import { 
  AccountCircle, Logout, Settings, 
  Menu as MenuIcon, QuestionAnswer
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ toggleSidebar, showMenuButton = false }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleAdminPanel = () => {
    handleClose();
    navigate('/admin');
  };

  const handleNavigateToChat = () => {
    handleClose();
    navigate('/');
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0} 
      sx={{ 
        bgcolor: 'background.paper', 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        zIndex: theme.zIndex.drawer + 1
      }}
    >
      <Toolbar>
        {/* Botão de Menu para mobile */}
        {showMenuButton && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2, color: 'text.primary' }}
            aria-label="Abrir menu lateral"
          >
            <MenuIcon />
          </IconButton>
        )}
        
        {/* Logo */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={handleNavigateToChat}
          >
            <QuestionAnswer 
              sx={{ 
                color: theme.palette.primary.main, 
                mr: 1,
                fontSize: 28
              }} 
            />
            <Typography
              variant="h6"
              component="div"
              sx={{ 
                fontWeight: 700,
                display: { xs: 'none', sm: 'flex' },
                color: 'text.primary'
              }}
            >
              Chat Acadêmico
            </Typography>
          </Box>
        </motion.div>

        <Box sx={{ flexGrow: 1 }} />

        {/* Área do usuário */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              mr: 2, 
              display: { xs: 'none', sm: 'block' },
              color: 'text.primary',
              fontWeight: 500
            }}
          >
            {user?.name}
          </Typography>
          
          <Tooltip title="Opções da conta">
            <IconButton
              onClick={handleMenu}
              size="small"
              edge="end"
              sx={{ 
                color: 'text.primary',
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: 2
              }}
            >
              <Badge
                variant="dot"
                color="primary"
                invisible={user?.role !== 'admin'}
                overlap="circular"
              >
                <AccountCircle />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              elevation: 3,
              sx: {
                borderRadius: 2,
                minWidth: 180,
                mt: 1
              }
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {user?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            
            <MenuItem 
              onClick={handleNavigateToChat}
              sx={{ 
                py: 1.5,
                '&:hover': { 
                  bgcolor: 'action.hover',
                  '& .MuiSvgIcon-root': { color: theme.palette.primary.main } 
                }
              }}
            >
              <QuestionAnswer fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
              Minhas Conversas
            </MenuItem>
            
            {user?.role === 'admin' && (
              <MenuItem 
                onClick={handleAdminPanel}
                sx={{ 
                  py: 1.5,
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    '& .MuiSvgIcon-root': { color: theme.palette.primary.main } 
                  }
                }}
              >
                <Settings fontSize="small" sx={{ mr: 2, color: 'text.secondary' }} />
                Painel Administrativo
              </MenuItem>
            )}
            
            <MenuItem 
              onClick={handleLogout}
              sx={{ 
                py: 1.5,
                color: theme.palette.error.main,
                '&:hover': { 
                  bgcolor: 'action.hover',
                }
              }}
            >
              <Logout fontSize="small" sx={{ mr: 2 }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
