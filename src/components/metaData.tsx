import { useEffect, useState } from 'react';
import UAParser from 'ua-parser-js';

export function useMetadata(app) {
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    const parser = new UAParser();
    const result = parser.getResult();

    const collectMetadata = async () => {
      const data = {
        timestamp: new Date().toISOString(),
        device: {
          type: result.device.type || 'desktop',
          model: result.device.model,
          vendor: result.device.vendor,
        },
        os: {
          name: result.os.name,
          version: result.os.version,
        },
        browser: {
          name: result.browser.name,
          version: result.browser.version,
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth,
        },
        network: {
          connection: navigator.connection?.effectiveType,
          downlink: navigator.connection?.downlink,
          rtt: navigator.connection?.rtt,
        },
        location: null,
        ipAddress: null,
      };

      // Get geolocation (requires user permission)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            data.location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            setMetadata(data);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setMetadata(data);
          }
        );
      }

      // Get IP address (requires backend)
      try {
        const ipResponse = await fetch(app + '/portal/api/get-ip');
        const ipData = await ipResponse.json();
        data.ipAddress = ipData.ip;
      } catch (error) {
        console.error('IP lookup failed:', error);
      }

      setMetadata(data);
    };

    collectMetadata();
  }, []);

  return metadata;
}