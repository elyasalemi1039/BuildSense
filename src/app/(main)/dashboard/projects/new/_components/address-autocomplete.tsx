"use client";

import { useEffect, useRef, useState } from "react";

import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, state: string, lat: number | null, lng: number | null) => void;
}

interface Prediction {
  place_id: string;
  description: string;
}

export function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load Google Maps script
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API key not configured");
      return;
    }

    if (window.google?.maps?.places) {
      initServices();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initServices;
    document.head.appendChild(script);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const initServices = () => {
    autocompleteService.current = new google.maps.places.AutocompleteService();
    // Create a dummy div for PlacesService
    const div = document.createElement("div");
    placesService.current = new google.maps.places.PlacesService(div);
  };

  const searchAddress = (input: string) => {
    if (!autocompleteService.current || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: "au" },
        types: ["address"],
      },
      (results, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(
            results.map((r) => ({
              place_id: r.place_id,
              description: r.description,
            }))
          );
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowPredictions(true);

    // Clear the main address if user types (forces them to select from autocomplete)
    onChange("", "", null, null);

    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      searchAddress(newValue);
    }, 300);
  };

  const selectPrediction = (prediction: Prediction) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["formatted_address", "geometry", "address_components"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const address = place.formatted_address || prediction.description;
          
          // Extract state from address components
          let state = "";
          place.address_components?.forEach((component) => {
            if (component.types.includes("administrative_area_level_1")) {
              state = component.short_name;
            }
          });

          const lat = place.geometry?.location?.lat() || null;
          const lng = place.geometry?.location?.lng() || null;

          setInputValue(address);
          onChange(address, state, lat, lng);
          setShowPredictions(false);
          setPredictions([]);
        }
      }
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          className="pl-9"
          placeholder="Start typing an address..."
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowPredictions(true)}
          onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
        />
      </div>

      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => selectPrediction(prediction)}
            >
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{prediction.description}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
      )}
    </div>
  );
}




