import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { motion } from 'motion/react';

interface GlobeProps {
  visitedCountries: string[]; // numeric codes (padded to 3 digits)
  onCountryClick?: (countryCode: string, countryName: string) => void;
  mode?: 'view' | 'paint';
  paintedCountries?: string[]; // numeric codes currently painted (for paint mode)
  onPaintToggle?: (countryCode: string, countryName: string) => void;
  focusCountryCode?: string; // numeric code to rotate globe to (paint mode search)
  interactiveCountryCodes?: string[];
  lockInteraction?: boolean;
  pulseCountryCode?: string;
}

const Globe: React.FC<GlobeProps> = ({ visitedCountries, onCountryClick, mode = 'view', paintedCountries = [], onPaintToggle, focusCountryCode, interactiveCountryCodes, lockInteraction = false, pulseCountryCode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef<[number, number, number]>([0, -30, 0]);
  const hasDraggedRef = useRef(false);
  const [rotation, setRotation] = useState<[number, number, number]>(rotationRef.current);
  const [worldData, setWorldData] = useState<any>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const isDragging = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathRef = useRef<d3.GeoPath<any, any> | null>(null);
  const svgGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((res) => res.json())
      .then((data) => {
        setWorldData(feature(data, data.objects.countries));
      });
  }, []);

  // Timer for auto-rotation (disabled in paint mode)
  useEffect(() => {
    if (mode === 'paint' || lockInteraction) return;
    const timer = d3.timer(() => {
      if (!isInteracting) {
        rotationRef.current = [rotationRef.current[0] + 0.1, rotationRef.current[1], rotationRef.current[2]];
        setRotation([...rotationRef.current]);
      }
    });
    return () => timer.stop();
  }, [isInteracting, mode, lockInteraction]);

  // Rotate globe to center on a specific country (used by search in paint mode)
  useEffect(() => {
    if (!focusCountryCode || !worldData) return;
    const found = worldData.features.find((f: any) => String(f.id).padStart(3, '0') === focusCountryCode);
    if (found) {
      const centroid = d3.geoCentroid(found);
      const newRotation: [number, number, number] = [-centroid[0], -centroid[1], 0];
      rotationRef.current = newRotation;
      setRotation(newRotation);
    }
  }, [focusCountryCode, worldData]);

  useEffect(() => {
    if (!worldData || !svgRef.current) return;

    const width = 600;
    const height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const projection = d3.geoOrthographic()
      .scale(240)
      .translate([width / 2, height / 2])
      .rotate(rotation);

    const path = d3.geoPath().projection(projection);

    // Ocean
    svg.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', projection.scale())
      .attr('fill', '#1e293b');

    // Countries
    svg.selectAll('.country')
      .data(worldData.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const countryId = String(d.id).padStart(3, '0');
        if (mode === 'paint') {
          if (paintedCountries.includes(countryId)) return '#22c55e';
          if (visitedCountries.includes(countryId)) return '#16a34a';
          return '#475569';
        }
        return visitedCountries.includes(countryId) ? '#22c55e' : '#475569';
      })
      .attr('opacity', (d: any) => {
        const countryId = String(d.id).padStart(3, '0');
        if (mode !== 'paint' && interactiveCountryCodes?.length) {
          return interactiveCountryCodes.includes(countryId) || !visitedCountries.includes(countryId) ? 1 : 0.95;
        }
        return 1;
      })
      .attr('stroke', (d: any) => {
        if (mode === 'paint') {
          const countryId = String(d.id).padStart(3, '0');
          if (paintedCountries.includes(countryId)) return '#4ade80';
          return '#0f172a';
        }
        return '#0f172a';
      })
      .attr('stroke-width', (d: any) => {
        if (mode === 'paint') {
          const countryId = String(d.id).padStart(3, '0');
          return paintedCountries.includes(countryId) ? 1.5 : 0.5;
        }
        return 0.5;
      })
      .style('cursor', (d: any) => {
        const countryId = String(d.id).padStart(3, '0');
        if (mode === 'paint') return 'pointer';
        if (interactiveCountryCodes?.length) {
          return interactiveCountryCodes.includes(countryId) ? 'pointer' : 'default';
        }
        return 'pointer';
      });

    // Graticule
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule())
      .attr('class', 'graticule')
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.2)
      .style('pointer-events', 'none');

    if (pulseCountryCode) {
      const pulseFeature = worldData.features.find((f: any) => String(f.id).padStart(3, '0') === pulseCountryCode);
      if (pulseFeature) {
        const [cx, cy] = path.centroid(pulseFeature);
        if (Number.isFinite(cx) && Number.isFinite(cy)) {
          const pulseLayer = svg.append('g').style('pointer-events', 'none');

          pulseLayer.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 7)
            .attr('fill', '#ffffff')
            .attr('opacity', 0.95);

          pulseLayer.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 10)
            .attr('fill', 'none')
            .attr('stroke', '#2dd4bf')
            .attr('stroke-width', 3)
            .attr('opacity', 0.95)
            .append('animate')
            .attr('attributeName', 'r')
            .attr('values', '10;18;10')
            .attr('dur', '2.4s')
            .attr('repeatCount', 'indefinite');

          pulseLayer.select('circle:nth-child(2)')
            .append('animate')
            .attr('attributeName', 'opacity')
            .attr('values', '0.95;0.35;0.95')
            .attr('dur', '2.4s')
            .attr('repeatCount', 'indefinite');
        }
      }
    }

  }, [worldData, rotation, visitedCountries, mode, paintedCountries, interactiveCountryCodes, pulseCountryCode, lockInteraction]);

  // Pointer event handlers for smooth drag on both desktop and mobile
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (lockInteraction) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    isDragging.current = true;
    hasDraggedRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setIsInteracting(true);
  }, [lockInteraction]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (lockInteraction) return;
    if (!isDragging.current) return;
    e.preventDefault();

    const dx = e.clientX - (lastPointer.current?.x ?? e.clientX);
    const dy = e.clientY - (lastPointer.current?.y ?? e.clientY);

    // Check if this is a drag vs a tap
    const totalDx = Math.abs(e.clientX - (dragStartPos.current?.x ?? e.clientX));
    const totalDy = Math.abs(e.clientY - (dragStartPos.current?.y ?? e.clientY));
    if (totalDx > 5 || totalDy > 5) hasDraggedRef.current = true;

    // Scale from CSS pixels to viewBox coordinates
    const svgEl = svgRef.current;
    const coordScale = svgEl ? 600 / svgEl.getBoundingClientRect().width : 1;
    const k = (75 / 240) * coordScale;

    const newRotation: [number, number, number] = [
      rotationRef.current[0] + dx * k,
      rotationRef.current[1] - dy * k,
      rotationRef.current[2]
    ];
    rotationRef.current = newRotation;
    setRotation(newRotation);

    lastPointer.current = { x: e.clientX, y: e.clientY };
  }, [lockInteraction]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (lockInteraction && !dragStartPos.current) {
      const svgEl = svgRef.current;
      if (svgEl && worldData) {
        const rect = svgEl.getBoundingClientRect();
        const scaleX = 600 / rect.width;
        const scaleY = 600 / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const proj = d3.geoOrthographic()
          .scale(240)
          .translate([300, 300])
          .rotate(rotationRef.current);

        const coords = proj.invert!([x, y]);
        if (coords) {
          const clickedFeature = worldData.features.find((f: any) => d3.geoContains(f, coords));
          if (clickedFeature && onCountryClick) {
            const countryId = String(clickedFeature.id).padStart(3, '0');
            if (!interactiveCountryCodes?.length || interactiveCountryCodes.includes(countryId)) {
              onCountryClick(clickedFeature.id, clickedFeature.properties.name);
            }
          }
        }
      }
      return;
    }
    if (!hasDraggedRef.current && dragStartPos.current) {
      // It's a tap/click — find the country
      const svgEl = svgRef.current;
      if (svgEl && worldData) {
        const rect = svgEl.getBoundingClientRect();
        const scaleX = 600 / rect.width;
        const scaleY = 600 / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const proj = d3.geoOrthographic()
          .scale(240)
          .translate([300, 300])
          .rotate(rotationRef.current);

        const coords = proj.invert!([x, y]);
        if (coords) {
          const clickedFeature = worldData.features.find((f: any) =>
            d3.geoContains(f, coords)
          );
          if (clickedFeature) {
            if (mode === 'paint' && onPaintToggle) {
              const countryId = String(clickedFeature.id).padStart(3, '0');
              if (!visitedCountries.includes(countryId)) {
                onPaintToggle(countryId, clickedFeature.properties.name);
              }
            } else if (onCountryClick) {
              const countryId = String(clickedFeature.id).padStart(3, '0');
              if (!interactiveCountryCodes?.length || interactiveCountryCodes.includes(countryId)) {
                onCountryClick(clickedFeature.id, clickedFeature.properties.name);
              }
            }
          }
        }
      }
    }
    isDragging.current = false;
    lastPointer.current = null;
    dragStartPos.current = null;
    setIsInteracting(false);
  }, [worldData, mode, onPaintToggle, onCountryClick, visitedCountries, interactiveCountryCodes, lockInteraction]);

  return (
    <div 
      ref={containerRef}
      data-tour="demo-globe-map"
      className="relative w-full max-w-[600px] max-h-[50vh] sm:max-h-[52vh] md:max-h-[52vh] lg:max-h-[65vh] aspect-square mx-auto"
      onMouseEnter={() => { if (!lockInteraction) setIsInteracting(true); }}
      onMouseLeave={() => setIsInteracting(false)}
      onTouchStart={() => { if (!lockInteraction) setIsInteracting(true); }}
      onTouchEnd={() => setIsInteracting(false)}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 600 600"
        className="w-full h-full drop-shadow-2xl"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {mode !== 'paint' && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gray-100 border-2 border-gray-200 px-5 py-2.5 rounded-full text-xs font-bold text-gray-500 shadow-sm whitespace-nowrap">
          Drag to rotate · Tap a green country to view trips
        </div>
      )}
    </div>
  );
};

export default Globe;
