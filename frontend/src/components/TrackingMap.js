import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert
} from '@mui/material';
import { Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import SmartMap from './SmartMap';
import { BASE_URL } from '../services/api';
import useWebSocket from '../hooks/useWebSocket';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TrackingMap = ({ height = 400, showInfo = true }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);

  // Load initial device locations
  const loadDevicesWithLocations = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/devices/locations`, {
        credentials: 'include' // Include cookies in the request
      });
      
      if (response.ok) {
        const devicesData = await response.json();
        setDevices(Array.isArray(devicesData) ? devicesData : []);
        
        // Set map center to first device with location or default
        const devicesWithLocation = Array.isArray(devicesData) ? devicesData.filter(device => device.location) : [];
        if (devicesWithLocation.length > 0) {
          setMapCenter([devicesWithLocation[0].location.latitude, devicesWithLocation[0].location.longitude]);
          setMapZoom(10);
        }
      } else {
        console.error('Failed to fetch device locations:', response.status);
        setDevices([]);
      }
    } catch (error) {
      console.error('Error fetching device locations:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket handler for real-time updates
  const handleWebSocketMessage = useCallback((message) => {
    try {
      const { topic, data } = message;
      
      switch (topic) {
        case 'device_update':
        case 'device_updated':
          // Update device location when new data comes in
          if (data.imei && (data.latitude || data.longitude)) {
            setDevices(prevDevices => {
              const deviceIndex = prevDevices.findIndex(d => d.imei === data.imei);
              
              if (deviceIndex >= 0) {
                // Update existing device
                const updatedDevices = [...prevDevices];
                const existingDevice = updatedDevices[deviceIndex];
                
                updatedDevices[deviceIndex] = {
                  ...existingDevice,
                  location: {
                    latitude: data.latitude || existingDevice.location?.latitude,
                    longitude: data.longitude || existingDevice.location?.longitude,
                    timestamp: data.timestamp || data.lastSeen || new Date().toISOString(),
                    speed: data.speed || existingDevice.location?.speed,
                    direction: data.direction || existingDevice.location?.direction
                  },
                  lastSeen: data.lastSeen || data.timestamp || new Date().toISOString()
                };
                
                return updatedDevices;
              } else {
                // Add new device if it has location data
                if (data.latitude && data.longitude) {
                  const newDevice = {
                    id: Date.now(),
                    name: data.name || `Device ${data.imei}`,
                    imei: data.imei,
                    status: data.isActive ? 'Active' : 'Inactive',
                    lastSeen: data.lastSeen || data.timestamp || new Date().toISOString(),
                    location: {
                      latitude: data.latitude,
                      longitude: data.longitude,
                      timestamp: data.timestamp || data.lastSeen || new Date().toISOString(),
                      speed: data.speed,
                      direction: data.direction
                    }
                  };
                  return [...prevDevices, newDevice];
                }
              }
              
              return prevDevices;
            });
          }
          break;
          
        case 'new_record':
          // Update device location when new record comes in
          if (data.deviceImei && data.latitude && data.longitude) {
            setDevices(prevDevices => {
              const deviceIndex = prevDevices.findIndex(d => d.imei === data.deviceImei);
              
              if (deviceIndex >= 0) {
                const updatedDevices = [...prevDevices];
                const existingDevice = updatedDevices[deviceIndex];
                
                updatedDevices[deviceIndex] = {
                  ...existingDevice,
                  location: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.datetime || data.timestamp || new Date().toISOString(),
                    speed: data.speed,
                    direction: data.direction
                  },
                  lastSeen: data.datetime || data.timestamp || new Date().toISOString()
                };
                
                return updatedDevices;
              }
              
              return prevDevices;
            });
          }
          break;
          
        default:
          // Ignore other message types
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message in TrackingMap:', error);
    }
  }, []);

  // Connect to WebSocket for real-time updates
  const ws = useWebSocket(`${BASE_URL.replace('http', 'ws')}`, handleWebSocketMessage);

  // Load initial data
  useEffect(() => {
    loadDevicesWithLocations();
  }, [loadDevicesWithLocations]);

  // Refresh device locations periodically (every 30 seconds) as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      loadDevicesWithLocations();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadDevicesWithLocations]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, height }}>
        <Typography>Loading devices...</Typography>
      </Paper>
    );
  }

  // Ensure devices is an array before filtering
  const devicesArray = Array.isArray(devices) ? devices : [];
  const devicesWithLocation = devicesArray.filter(device => device && device.location);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={showInfo ? 8 : 12}>
        <Paper sx={{ p: 2, height }}>
          <Typography variant="h6" gutterBottom>
            Device Locations
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <SmartMap
            center={mapCenter}
            zoom={mapZoom}
            height="100%"
          >
            {devicesWithLocation.map((device) => (
              <Marker 
                key={device.imei}
                position={[device.location.latitude, device.location.longitude]}
              >
                <Popup>
                  <div>
                    <strong>{device.name || device.imei}</strong><br />
                    <strong>IMEI:</strong> {device.imei}<br />
                    <strong>Last Seen:</strong> {new Date(device.location.timestamp).toLocaleString()}<br />
                    {device.location.speed && (
                      <><strong>Speed:</strong> {device.location.speed} km/h<br /></>
                    )}
                    {device.location.direction && (
                      <><strong>Direction:</strong> {device.location.direction}°<br /></>
                    )}
                    <strong>Coordinates:</strong><br />
                    {device.location.latitude.toFixed(6)}, {device.location.longitude.toFixed(6)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </SmartMap>
        </Paper>
      </Grid>

      {showInfo && (
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Device Status
            </Typography>
            
            {devicesWithLocation.length > 0 ? (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {devicesWithLocation.length} devices with location data
                </Typography>
                
                {devicesWithLocation.map((device) => (
                  <Card key={device.imei} sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {device.name || device.imei}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>IMEI:</strong> {device.imei}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Last Seen:</strong> {new Date(device.location.timestamp).toLocaleString()}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={`${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`} 
                          size="small" 
                          sx={{ mr: 1, mb: 1 }}
                        />
                        {device.location.speed && (
                          <Chip 
                            label={`${device.location.speed} km/h`} 
                            size="small" 
                            color="primary" 
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )}
                        {device.location.direction && (
                          <Chip 
                            label={`${device.location.direction}°`} 
                            size="small" 
                            color="secondary" 
                            sx={{ mb: 1 }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No devices with location data available.
              </Typography>
            )}
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default TrackingMap; 