'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MapPin, RotateCcw, HelpCircle } from 'lucide-react';

// Google Maps types
declare global {
  interface Window {
    google: any;
    roofMarkers?: any[];
  }
}

interface RoofMappingStepProps {
  selectedAddress: any;
  onNext: () => void;
  onPrevious: () => void;
  companyColor?: string;
  onRoofMappingComplete: (mappingData: {
    roofImage: string;
    roofCoordinates: any;
    mapCenter: { lat: number; lng: number };
    zoom: number;
  }) => void;
}

interface MapCoordinates {
  lat: number;
  lng: number;
}

interface RoofPoint {
  lat: number;
  lng: number;
}

export default function RoofMappingStep({
  selectedAddress,
  onNext,
  onPrevious,
  companyColor = '#2563eb',
  onRoofMappingComplete
}: RoofMappingStepProps) {
  const [currentStep, setCurrentStep] = useState<'pin' | 'draw' | 'confirm'>('pin');
  const [mapCenter, setMapCenter] = useState<MapCoordinates | null>(null);
  const [roofPoints, setRoofPoints] = useState<RoofPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<RoofPoint | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const previewLineRef = useRef<any>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Canvas mouse event handlers
  const handleCanvasMouseDown = useCallback((e: MouseEvent) => {
    if (currentStep !== 'draw') return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert canvas coordinates to lat/lng
    const point = new window.google.maps.Point(x, y);
    const latLng = mapInstanceRef.current.getProjection()?.fromPointToLatLng(point);
    
    if (!latLng) return;
    
    const lat = latLng.lat();
    const lng = latLng.lng();
    const newPoint = { lat, lng };
    
    // Check if user clicked on the starting point to close the polygon (only after 3+ points)
    if (roofPoints.length >= 3) {
      const startPoint = roofPoints[0];
      const distance = Math.sqrt(
        Math.pow(lat - startPoint.lat, 2) + Math.pow(lng - startPoint.lng, 2)
      );
      
      // If click is within 0.0001 degrees of starting point, close the polygon
      if (distance < 0.0001) {
        setCurrentStep('confirm');
        return;
      }
    }
    
    // Add the new point to the array
    setRoofPoints(prev => {
      const updatedPoints = [...prev, newPoint];
      
      // Update polygon with all points
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }

      if (updatedPoints.length >= 2) {
        console.log('Creating polygon with points:', updatedPoints);
        polygonRef.current = new window.google.maps.Polygon({
          paths: updatedPoints,
          strokeColor: companyColor,
          strokeOpacity: 0.8,
          strokeWeight: 3,
          fillColor: companyColor,
          fillOpacity: 0.1, // Much more transparent
          map: mapInstanceRef.current
        });
      }

      // Add visual markers for each point
      const isFirstPoint = updatedPoints.length === 1;
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isFirstPoint ? 10 : 8, // Larger markers
          fillColor: isFirstPoint ? '#00ff00' : companyColor,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: isFirstPoint ? 4 : 3, // Thicker borders
        },
        title: isFirstPoint ? 'Starting point - click here to close' : `Point ${updatedPoints.length}`,
        zIndex: 1000 // Ensure markers are on top
      });

      // Store markers for cleanup
      if (!window.roofMarkers) {
        window.roofMarkers = [];
      }
      window.roofMarkers.push(marker);
      
      return updatedPoints;
    });
  }, [currentStep, roofPoints, companyColor]);

  // Update preview line function
  const updatePreviewLine = useCallback((mousePos: RoofPoint) => {
    if (currentStep === 'draw' && roofPoints.length > 0 && mapInstanceRef.current) {
      // Remove existing preview line
      if (previewLineRef.current) {
        previewLineRef.current.setMap(null);
      }

      // Get the last point
      const lastPoint = roofPoints[roofPoints.length - 1];
      
      // Create preview line from last point to mouse position
      previewLineRef.current = new window.google.maps.Polyline({
        path: [lastPoint, mousePos],
        geodesic: true,
        strokeColor: companyColor,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        strokePattern: [10, 5], // Dashed line
        map: mapInstanceRef.current
      });
    }
  }, [currentStep, roofPoints, companyColor]);

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (currentStep !== 'draw' || roofPoints.length === 0) return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert canvas coordinates to lat/lng
    const point = new window.google.maps.Point(x, y);
    const latLng = mapInstanceRef.current.getProjection()?.fromPointToLatLng(point);
    
    if (!latLng) return;
    
    const lat = latLng.lat();
    const lng = latLng.lng();
    setMousePosition({ lat, lng });
    
    // Update preview line
    updatePreviewLine({ lat, lng });
  }, [currentStep, roofPoints, companyColor, updatePreviewLine]);

  const handleCanvasMouseUp = useCallback((e: MouseEvent) => {
    // Handle any mouse up logic if needed
  }, []);

  // Setup drawing canvas overlay
  const setupDrawingCanvas = useCallback(() => {
    if (!mapRef.current || !drawingCanvasRef.current || !canvasContainerRef.current) return;

    const mapContainer = mapRef.current;
    const canvasContainer = canvasContainerRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    
    // Set canvas container size to match map
    canvasContainer.style.width = mapContainer.offsetWidth + 'px';
    canvasContainer.style.height = mapContainer.offsetHeight + 'px';
    
    // Set canvas size
    drawingCanvas.width = mapContainer.offsetWidth;
    drawingCanvas.height = mapContainer.offsetHeight;
    
    // Add event listeners (they'll only work when pointer-events is auto)
    drawingCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    drawingCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    drawingCanvas.addEventListener('mouseup', handleCanvasMouseUp);
  }, [handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp]);

  // Initialize map center from selected address
  useEffect(() => {
    console.log('Selected address changed:', selectedAddress);
    console.log('Address properties:', selectedAddress ? Object.keys(selectedAddress) : 'No address');
    
    if (selectedAddress) {
      // Try different possible coordinate property names
      let lat, lng;
      
      if (selectedAddress.latitude && selectedAddress.longitude) {
        lat = parseFloat(selectedAddress.latitude);
        lng = parseFloat(selectedAddress.longitude);
        console.log('Using latitude/longitude properties');
      } else if (selectedAddress.lat && selectedAddress.lng) {
        lat = parseFloat(selectedAddress.lat);
        lng = parseFloat(selectedAddress.lng);
        console.log('Using lat/lng properties');
      } else if (selectedAddress.coordinates) {
        lat = parseFloat(selectedAddress.coordinates.lat);
        lng = parseFloat(selectedAddress.coordinates.lng);
        console.log('Using coordinates object');
      } else {
        console.log('No coordinates found in address, attempting geocoding...');
        // Try geocoding the address
        const geocodeAddress = async () => {
          try {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
              console.error('No API key for geocoding');
              return;
            }
            
            const addressString = selectedAddress.formatted_address || 
              `${selectedAddress.address_line_1 || ''}, ${selectedAddress.town_or_city || ''}, ${selectedAddress.postcode || ''}`.trim();
            
            console.log('Geocoding address:', addressString);
            
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`
            );
            
            const data = await response.json();
            console.log('Geocoding response:', data);
            
            if (data.status === 'OK' && data.results && data.results[0]) {
              const location = data.results[0].geometry.location;
              const center = {
                lat: location.lat,
                lng: location.lng
              };
              console.log('Geocoded coordinates:', center);
              setMapCenter(center);
            } else {
              console.error('Geocoding failed:', data.status, data.error_message);
              setMapError(`Failed to find location: ${data.status} - ${data.error_message || 'Unknown error'}`);
            }
          } catch (error) {
            console.error('Geocoding error:', error);
            setMapError('Failed to geocode address');
          }
        };
        
        geocodeAddress();
        return;
      }
      
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        const center = { lat, lng };
        console.log('Setting map center:', center);
        setMapCenter(center);
      } else {
        console.log('Invalid coordinates:', { lat, lng });
        setMapError('Invalid coordinates in selected address');
      }
    } else {
      console.log('No selected address');
    }
  }, [selectedAddress]);

  // Load Google Maps
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const loadGoogleMaps = () => {
      console.log('loadGoogleMaps called');
      console.log('window.google:', !!window.google);
      console.log('mapRef.current:', !!mapRef.current);
      console.log('mapCenter:', mapCenter);
      
      if (window.google && mapRef.current && mapCenter) {
        console.log('Creating Google Maps instance...');
        const map = new window.google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: 20,
          mapTypeId: 'satellite',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.TOP_RIGHT,
          },
          gestureHandling: 'greedy',
          disableDefaultUI: true,
          tilt: 0,
          heading: 0,
          styles: [
            {
              featureType: 'all',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Force 2D top view and prevent 3D tilting
        map.setTilt(0);
        map.setHeading(0);
        
        // Disable tilt gestures
        map.setOptions({
          gestureHandling: 'greedy',
          restriction: {
            latLngBounds: {
              north: 85,
              south: -85,
              east: 180,
              west: -180
            },
            strictBounds: false
          }
        });

        mapInstanceRef.current = map;

        // Prevent 3D tilting by listening for tilt changes and resetting them
        map.addListener('tilt_changed', () => {
          if (map.getTilt() !== 0) {
            map.setTilt(0);
          }
        });

        map.addListener('heading_changed', () => {
          if (map.getHeading() !== 0) {
            map.setHeading(0);
          }
        });

        // Add crosshairs for pinning step
        if (currentStep === 'pin') {
          const crosshairsDiv = document.createElement('div');
          crosshairsDiv.setAttribute('data-crosshairs', 'true');
          crosshairsDiv.innerHTML = `
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 1000;
              pointer-events: none;
            ">
              <!-- Horizontal line across full width -->
              <div style="
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                height: 2px;
                transform: translateY(-50%);
                border-top: 2px dashed white;
              "></div>
              <!-- Vertical line across full height -->
              <div style="
                position: absolute;
                left: 50%;
                top: 0;
                width: 2px;
                height: 100%;
                transform: translateX(-50%);
                border-left: 2px dashed white;
              "></div>
              <!-- Center dot -->
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 12px;
                height: 12px;
                background: ${companyColor || '#2563eb'};
                border-radius: 50%;
                transform: translate(-50%, -50%);
              "></div>
            </div>
          `;
          mapRef.current.appendChild(crosshairsDiv);
        }

        setMapLoaded(true);
        setMapError(null);
      }
    };

    // Check if Google Maps is already loaded
    console.log('Checking Google Maps availability...');
    console.log('window.google:', !!window.google);
    console.log('window.google.maps:', !!(window.google && window.google.maps));
    
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded, initializing map...');
      loadGoogleMaps();
    } else {
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      console.log('Existing Google Maps script found:', !!existingScript);
      
      if (existingScript) {
        console.log('Google Maps script already loading, waiting for it...');
        // Script is already loading, wait for it
        checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            console.log('Google Maps loaded via existing script');
            if (checkInterval) clearInterval(checkInterval);
            loadGoogleMaps();
          }
        }, 100);
        
        // Cleanup after 10 seconds
        setTimeout(() => {
          if (checkInterval) clearInterval(checkInterval);
        }, 10000);
      } else {
        // Load the script
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        console.log('Google Maps API Key:', apiKey ? 'Present' : 'Missing');
        if (!apiKey) {
          console.error('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.');
          return;
        }
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          console.log('Google Maps script loaded successfully');
          console.log('window.google after script load:', !!window.google);
          console.log('window.google.maps after script load:', !!(window.google && window.google.maps));
          loadGoogleMaps();
        };
        script.onerror = (error) => {
          console.error('Failed to load Google Maps API:', error);
          console.error('Script src:', script.src);
          setMapError('Failed to load Google Maps API. Please check your API key and network connection.');
        };
        console.log('Adding Google Maps script to document head');
        console.log('Script URL:', script.src);
        
        // Test the API key by making a simple request
        fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=London&key=${apiKey}`)
          .then(response => response.json())
          .then(data => {
            console.log('Google Maps API test response:', data);
            if (data.error_message) {
              console.error('Google Maps API error:', data.error_message);
              setMapError(`Google Maps API error: ${data.error_message}`);
            }
          })
          .catch(error => {
            console.error('Google Maps API test failed:', error);
            setMapError('Google Maps API test failed. Please check your API key.');
          });
        
        document.head.appendChild(script);
        
        // Set a timeout to show error if map doesn't load
        timeoutId = setTimeout(() => {
          if (!mapLoaded) {
            setMapError('Map loading timeout. Please check your internet connection and API key.');
          }
        }, 10000);
      }
    }

    // Cleanup function
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [mapCenter]);

  // Update crosshairs when step changes
  useEffect(() => {
    if (mapLoaded && mapRef.current && mapInstanceRef.current) {
      // Remove existing crosshairs
      const existingCrosshairs = mapRef.current.querySelector('[data-crosshairs]');
      if (existingCrosshairs) {
        existingCrosshairs.remove();
      }

      // Enable/disable map dragging based on current step
      if (currentStep === 'draw') {
        // Disable dragging during drawing step
        mapInstanceRef.current.setOptions({
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          keyboardShortcuts: false
        });
      } else {
        // Enable dragging for other steps
        mapInstanceRef.current.setOptions({
          draggable: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          keyboardShortcuts: true
        });
      }

      // Add crosshairs for pinning step
      if (currentStep === 'pin') {
        const crosshairsDiv = document.createElement('div');
        crosshairsDiv.setAttribute('data-crosshairs', 'true');
        crosshairsDiv.innerHTML = `
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            pointer-events: none;
          ">
            <!-- Horizontal line across full width -->
            <div style="
              position: absolute;
              top: 50%;
              left: 0;
              width: 100%;
              height: 2px;
              transform: translateY(-50%);
              border-top: 2px dashed white;
              box-shadow: 0 0 4px rgba(0,0,0,0.8);
            "></div>
            <!-- Vertical line across full height -->
            <div style="
              position: absolute;
              left: 50%;
              top: 0;
              width: 2px;
              height: 100%;
              transform: translateX(-50%);
              border-left: 2px dashed white;
              box-shadow: 0 0 4px rgba(0,0,0,0.8);
            "></div>
            <!-- Center dot -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              width: 12px;
              height: 12px;
              background: ${companyColor};
              border: 3px solid white;
              border-radius: 50%;
              transform: translate(-50%, -50%);
              box-shadow: 0 0 6px rgba(0,0,0,0.7);
            "></div>
          </div>
        `;
        mapRef.current.appendChild(crosshairsDiv);
      }
    }
  }, [currentStep, mapLoaded, companyColor]);

  // Handle map click for pinning
  const handleMapClick = useCallback((event: any) => {
    if (currentStep === 'pin' && mapInstanceRef.current) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }

      // Add new marker
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: companyColor,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
        title: 'Your house location'
      });

      setMapCenter({ lat, lng });
    }
  }, [currentStep, companyColor]);


  // Set up map click listeners
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      const clickListener = mapInstanceRef.current.addListener('click', (event: any) => {
        if (currentStep === 'pin') {
          handleMapClick(event);
        }
      });

      return () => {
        window.google.maps.event.removeListener(clickListener);
      };
    }
  }, [mapLoaded, currentStep, handleMapClick]);

  // Setup canvas when map loads
  useEffect(() => {
    if (mapLoaded) {
      setupDrawingCanvas();
    }
  }, [mapLoaded, setupDrawingCanvas]);

  // Resize canvas when entering draw step
  useEffect(() => {
    if (currentStep === 'draw' && mapLoaded && drawingCanvasRef.current && canvasContainerRef.current) {
      const mapContainer = mapRef.current;
      const canvasContainer = canvasContainerRef.current;
      const drawingCanvas = drawingCanvasRef.current;
      
      if (mapContainer) {
        // Set canvas container size to match map
        canvasContainer.style.width = mapContainer.offsetWidth + 'px';
        canvasContainer.style.height = mapContainer.offsetHeight + 'px';
        
        // Set canvas size
        drawingCanvas.width = mapContainer.offsetWidth;
        drawingCanvas.height = mapContainer.offsetHeight;
      }
    }
  }, [currentStep, mapLoaded]);

  // Handle step transitions
  const handlePinComplete = () => {
    setCurrentStep('draw');
  };

  const handleDrawComplete = () => {
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    if (mapInstanceRef.current && roofPoints.length > 0) {
      try {
        // Take screenshot of the map
        if (!mapRef.current) {
          throw new Error('Map element not found');
        }
        
        const canvas = await html2canvas(mapRef.current, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        
        const imageData = canvas.toDataURL('image/png');
        
        // Get current map center and zoom
        const center = mapInstanceRef.current.getCenter();
        const zoom = mapInstanceRef.current.getZoom();
        
        const mappingData = {
          roofImage: imageData,
          roofCoordinates: roofPoints,
          mapCenter: {
            lat: center.lat(),
            lng: center.lng()
          },
          zoom: zoom
        };

        // Store in session storage
        sessionStorage.setItem('roofMappingData', JSON.stringify(mappingData));
        
        onRoofMappingComplete(mappingData);
        onNext();
      } catch (error) {
        console.error('Error capturing roof mapping:', error);
        // Fallback - continue without screenshot
        onNext();
      }
    }
  };

  const handleRedraw = () => {
    setRoofPoints([]);
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    if (previewLineRef.current) {
      previewLineRef.current.setMap(null);
    }
    // Clean up markers
    if (window.roofMarkers) {
      window.roofMarkers.forEach((marker: any) => marker.setMap(null));
      window.roofMarkers = [];
    }
    setCurrentStep('draw');
  };

  const handleReset = () => {
    setCurrentStep('pin');
    setRoofPoints([]);
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    if (previewLineRef.current) {
      previewLineRef.current.setMap(null);
    }
    // Clean up roof markers
    if (window.roofMarkers) {
      window.roofMarkers.forEach((marker: any) => marker.setMap(null));
      window.roofMarkers = [];
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 'pin':
        return {
          icon: <MapPin className="w-8 h-8" />,
          title: "Pin your roof",
          description: "Drag the map to the centre of your house, then click next",
          buttonText: "Next →",
          buttonAction: handlePinComplete,
          showButton: true
        };
      case 'draw':
        return {
          icon: <div className="w-8 h-8 border-2 border-gray-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>,
          title: roofPoints.length === 0 ? "Click to start drawing" : "Click corners of your roof",
          description: roofPoints.length === 0 
            ? "Click on the **first corner** of your roof to start drawing"
            : roofPoints.length < 3 
            ? "Click on the **next corner** of your roof"
            : "Click on the **green starting point** to close the roof outline",
          buttonText: roofPoints.length > 0 ? "Done" : "Start drawing",
          buttonAction: roofPoints.length > 0 ? handleDrawComplete : undefined,
          showButton: roofPoints.length > 0
        };
      case 'confirm':
        return {
          icon: <Check className="w-8 h-8 text-green-600" />,
          title: "Roof drawn!",
          description: "Click done if you're happy with the outline. If not, you can re-draw it",
          buttonText: "Done",
          buttonAction: handleConfirm,
          showButton: true,
          showRedraw: true
        };
      default:
        return null;
    }
  };

  const stepContent = getStepContent();
  if (!stepContent) return null;

  return (
    <div className="min-h-[calc(100vh-150px)] bg-gray-50">
      <div className="flex h-[calc(100vh-102px)]">
        {/* Left Panel - Instructions */}
        <div className="w-1/2 bg-white flex flex-col justify-center items-center p-8 h-full">
          <div className="max-w-sm w-full">
            {/* Step Content */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              {/* Icon */}
              <div className="flex justify-center">
                {stepContent.icon}
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900">
                {stepContent.title}
              </h2>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed">
                {stepContent.description.split('**').map((part, index) => 
                  index % 2 === 1 ? (
                    <strong key={index} className="font-semibold">{part}</strong>
                  ) : (
                    <span key={index}>{part}</span>
                  )
                )}
              </p>

              {/* Help Text */}
              {currentStep === 'draw' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 You can click and drag a corner to fine tune
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {stepContent.showButton && (
                  <button
                    onClick={stepContent.buttonAction}
                    className="w-full px-6 py-3 rounded-full text-white font-medium text-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: companyColor }}
                  >
                    {stepContent.buttonText}
                  </button>
                )}

                {stepContent.showRedraw && (
                  <button
                    onClick={handleRedraw}
                    className="w-full px-6 py-3 rounded-full border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-2" />
                    Re-draw it
                  </button>
                )}

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Start over
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="w-1/2 relative">
          <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh-150px)' }}
          />
          
          {/* Canvas overlay for precise drawing - always present but only active during draw step */}
          <div 
            ref={canvasContainerRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ 
              zIndex: currentStep === 'draw' ? 1000 : -1,
              pointerEvents: currentStep === 'draw' ? 'auto' : 'none'
            }}
          >
            <canvas 
              ref={drawingCanvasRef}
              className="w-full h-full"
              style={{ 
                cursor: currentStep === 'draw' ? 'crosshair' : 'default',
                pointerEvents: currentStep === 'draw' ? 'auto' : 'none'
              }}
            />
          </div>
          
          {/* Map Loading/Error State */}
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading map...</p>
                {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                  <p className="text-red-600 text-sm mt-2">
                    Google Maps API key not configured
                  </p>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  <p>Debug info:</p>
                  <p>API Key: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}</p>
                  <p>Map Center: {mapCenter ? `${mapCenter.lat}, ${mapCenter.lng}` : 'Not set'}</p>
                  <p>Selected Address: {selectedAddress ? 'Present' : 'Missing'}</p>
                  {selectedAddress && (
                    <div className="mt-2">
                      <p>Address properties: {Object.keys(selectedAddress).join(', ')}</p>
                      <p>Has lat/lng: {selectedAddress.latitude && selectedAddress.longitude ? 'Yes' : 'No'}</p>
                      <p>Has lat/lng alt: {selectedAddress.lat && selectedAddress.lng ? 'Yes' : 'No'}</p>
                      <p>Formatted address: {selectedAddress.formatted_address || 'None'}</p>
                    </div>
                  )}
                  {mapError && (
                    <p className="text-red-600 mt-2">Error: {mapError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Map Overlay Instructions */}
          {currentStep === 'draw' && roofPoints.length > 0 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
              💡 You can click and drag a corner to fine tune
            </div>
          )}

          {/* Compass Overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-xs font-bold">
            <div className="flex items-center gap-2">
              <span>N</span>
              <span>E</span>
              <span>S</span>
              <span>W</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">How to map your roof</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Step 1:</strong> Pin your house location on the map</p>
                <p><strong>Step 2:</strong> Click the corners of your roof to draw the outline</p>
                <p><strong>Step 3:</strong> Review and confirm your roof mapping</p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-4 w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// html2canvas function for screenshot
async function html2canvas(element: HTMLElement, options: any = {}) {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(element, options);
}
