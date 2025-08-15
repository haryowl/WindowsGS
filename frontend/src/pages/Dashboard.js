// frontend/src/pages/Dashboard.js

import React, { useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  alpha,
  useTheme,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  DeviceHub as DeviceIcon,
  Warning as AlertIcon,
  Storage as DataIcon,
  AccessTime as TimeIcon,
  SignalCellular4Bar as SignalIcon,
  Speed as SpeedIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useData } from '../contexts/DataContext';
import { useSnackbar } from 'notistack';
import TrackingMap from '../components/TrackingMap';
import DataChart from '../components/DataChart';
import LoadingState from '../components/LoadingState';

const Dashboard = () => {
  const { devices, records, alerts, stats, loading, error, refreshStats } = useData();
  const { enqueueSnackbar } = useSnackbar();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [statsRange, setStatsRange] = useState('last24h'); // 'last24h' or 'allTime'
  const theme = useTheme();

  // Helper to get the correct stats object
  const getStats = () => {
    if (stats && stats[statsRange]) return stats[statsRange];
    // fallback for old structure
    return stats;
  };
  const currentStats = getStats();

  const handleStatsRange = (event, newRange) => {
    if (newRange) setStatsRange(newRange);
  };

  const handleRefresh = async () => {
    try {
      await refreshStats();
      setLastRefresh(new Date());
      enqueueSnackbar('Dashboard refreshed', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to refresh dashboard', { variant: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const formatLastUpdate = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 1, mb: 2 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        p: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`
      }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            System Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time monitoring and analytics for your OHW devices
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={statsRange}
            exclusive
            onChange={handleStatsRange}
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="last24h">Last 24 Hours</ToggleButton>
            <ToggleButton value="allTime">All Time</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Last updated
            </Typography>
            <Typography variant="subtitle2" fontWeight="600">
              {formatLastUpdate(lastRefresh)}
            </Typography>
          </Box>
          <Tooltip title="Refresh dashboard">
            <IconButton 
              onClick={handleRefresh} 
              sx={{ 
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="caption" fontWeight="500">
                    Total Devices
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold" color="primary.main">
                    {currentStats.totalDevices}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 1.5, 
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }}>
                  <DeviceIcon color="primary" sx={{ fontSize: 24 }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={`${currentStats.activeDevices} active`} 
                  color="success" 
                  size="small" 
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {currentStats.totalDevices > 0 ? Math.round((currentStats.activeDevices / currentStats.totalDevices) * 100) : 0}% online
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2" fontWeight="500">
                    Active Devices
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold" color="success.main">
                    {currentStats.activeDevices}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  backgroundColor: alpha(theme.palette.success.main, 0.1)
                }}>
                  <SignalIcon color="success" sx={{ fontSize: 32 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={currentStats.totalDevices > 0 ? (currentStats.activeDevices / currentStats.totalDevices) * 100 : 0}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: alpha(theme.palette.success.main, 0.2),
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: theme.palette.success.main,
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2" fontWeight="500">
                    Total Records
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold" color="info.main">
                    {currentStats.totalRecords.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  backgroundColor: alpha(theme.palette.info.main, 0.1)
                }}>
                  <DataIcon color="info" sx={{ fontSize: 32 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon sx={{ fontSize: 16 }} />
                  {records.length > 0 ? `Latest: ${new Date(records[0]?.timestamp).toLocaleString()}` : 'No recent data'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.light, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2" fontWeight="500">
                    Active Alerts
                  </Typography>
                  <Typography variant="h3" component="div" fontWeight="bold" color="warning.main">
                    {currentStats.totalAlerts}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  backgroundColor: alpha(theme.palette.warning.main, 0.1)
                }}>
                  <AlertIcon color="warning" sx={{ fontSize: 32 }} />
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Chip 
                  label={Array.isArray(alerts) && alerts.length > 0 ? `${alerts.filter(a => a.status === 'active').length} active` : 'No alerts'} 
                  color={Array.isArray(alerts) && alerts.length > 0 ? "warning" : "default"} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Map Section */}
        <Grid item xs={12}>
          <Card sx={{ height: 500 }}>
            <CardContent sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" fontWeight="600">
                  Device Locations
                </Typography>
                <Chip 
                  label={`${Array.isArray(devices) ? devices.filter(d => d.latitude && d.longitude).length : 0} devices tracked`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>
              <Box sx={{ height: 'calc(100% - 60px)', borderRadius: 2, overflow: 'hidden' }}>
                <TrackingMap />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Trends Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight="600" gutterBottom>
                Data Trends & Analytics
              </Typography>
              <DataChart 
                data={Array.isArray(records) ? records.slice(0, 100) : []} 
                compact={false}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight="600" gutterBottom>
                Recent Device Activity
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {Array.isArray(devices) ? devices.slice(0, 5).map((device) => (
                  <Box 
                    key={device.id} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      p: 2,
                      mb: 1,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        {device.name || device.imei}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last seen: {formatLastUpdate(device.lastSeen)}
                      </Typography>
                    </Box>
                    <Chip 
                      label={device.status} 
                      color={getStatusColor(device.status)} 
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                )) : (
                  <Typography variant="body2" color="text.secondary">
                    No devices available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight="600" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SpeedIcon color="success" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        Data Processing
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active and running
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="Online" color="success" size="small" />
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LocationIcon color="info" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        GPS Tracking
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Array.isArray(devices) ? devices.filter(d => d.latitude && d.longitude).length : 0} devices tracked
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="Active" color="info" size="small" />
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AlertIcon color="warning" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        Alert System
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Array.isArray(alerts) ? alerts.filter(a => a.status === 'active').length : 0} active alerts
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={Array.isArray(alerts) && alerts.filter(a => a.status === 'active').length > 0 ? "Warning" : "Normal"} 
                    color={Array.isArray(alerts) && alerts.filter(a => a.status === 'active').length > 0 ? "warning" : "success"} 
                    size="small" 
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
