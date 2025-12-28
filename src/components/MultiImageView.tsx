import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Group, Rect } from 'react-konva';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Download, Edit3, ChevronLeft, ChevronRight, Grid, Maximize2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { getGenerationsFromHistory, StoredGeneration } from '../utils/storage';
import { EditPanel } from './EditPanel';

export const MultiImageView: React.FC = () => {
  const { canvasImage, setCanvasImage, isGenerating } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  const [savedHistory, setSavedHistory] = useState<StoredGeneration[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [singleImage, setSingleImage] = useState<HTMLImageElement | null>(null);
  const [gridImages, setGridImages] = useState<any[]>([]);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('grid'); // Default to grid view

  const generationStartTime = useAppStore((state) => state.generationStartTime);

  // Load history
  useEffect(() => {
    const history = getGenerationsFromHistory();
    setSavedHistory(history);
    if (history.length > 0 && !canvasImage) {
      setCanvasImage(history[history.length - 1].imageUrl);
      setCurrentIndex(history.length - 1);
    }
  }, []);

  // Track generation time
  useEffect(() => {
    if (isGenerating && generationStartTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - generationStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else if (!isGenerating) {
      setElapsedTime(0);
    }
  }, [isGenerating, generationStartTime]);

  // Load current image (Single View)
  useEffect(() => {
    if (canvasImage && viewMode === 'single') {
      const img = new window.Image();
      img.onload = () => {
        setSingleImage(img);
        // Auto-fit image
        if (zoom === 1 && pan.x === 0 && pan.y === 0) {
          const padding = 0.85;
          const scaleX = (stageSize.width * padding) / img.width;
          const scaleY = (stageSize.height * padding) / img.height;
          const optimalZoom = Math.min(scaleX, scaleY, 1);
          setZoom(optimalZoom);
          setPan({ x: 0, y: 0 });
        }
      };
      img.onerror = () => {
          setSingleImage(null);
      };
      img.src = canvasImage;

      // Update current index
      const idx = savedHistory.findIndex(h => h.imageUrl === canvasImage);
      if (idx >= 0) setCurrentIndex(idx);
    } else if (!canvasImage) {
      setSingleImage(null);
    }
  }, [canvasImage, stageSize, viewMode]);

  // Load grid images (Grid View)
  useEffect(() => {
    if (viewMode === 'grid' && savedHistory.length > 0) {
      const imagesToLoad = savedHistory.slice(-4).reverse();

      Promise.all(imagesToLoad.map(item => new Promise<{image: HTMLImageElement, item: StoredGeneration} | null>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve({ image: img, item });
          img.onerror = () => resolve(null);
          img.src = item.imageUrl;
      }))).then(results => {
          const loaded = results.filter(r => r !== null) as {image: HTMLImageElement, item: StoredGeneration}[];
          if (loaded.length === 0) return;

          // Layout Calculation
          // Use the first image dimensions as reference for grid cells
          const refW = loaded[0].image.width;
          const refH = loaded[0].image.height;

          const laidOut = loaded.map((data, idx) => {
              const col = idx % 2;
              const row = Math.floor(idx / 2);
              return {
                  ...data,
                  x: col * refW,
                  y: row * refH,
                  width: data.image.width,
                  height: data.image.height
              };
          });

          setGridImages(laidOut);

          // Auto fit grid to stage
          const cols = Math.min(loaded.length, 2);
          const rows = Math.ceil(loaded.length / 2);
          const totalW = cols * refW;
          const totalH = rows * refH;

          const padding = 0.9;
          const scaleX = (stageSize.width * padding) / totalW;
          const scaleY = (stageSize.height * padding) / totalH;

          // For grid, we usually want to see everything, so fit it initially
          setZoom(Math.min(scaleX, scaleY));
          setPan({x: 0, y: 0});
      });
    }
  }, [viewMode, savedHistory, stageSize.width, stageSize.height]);


  // Handle stage resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.05, Math.min(10, prev + delta))); // Expanded zoom range
  };

  const handleReset = () => {
    if (viewMode === 'single' && singleImage) {
      const padding = 0.85;
      const scaleX = (stageSize.width * padding) / singleImage.width;
      const scaleY = (stageSize.height * padding) / singleImage.height;
      setZoom(Math.min(scaleX, scaleY, 1));
      setPan({ x: 0, y: 0 });
    } else if (viewMode === 'grid' && gridImages.length > 0) {
        // Recalculate fit for grid
        const refW = gridImages[0].image.width;
        const refH = gridImages[0].image.height;
        const cols = Math.min(gridImages.length, 2);
        const rows = Math.ceil(gridImages.length / 2);
        const totalW = cols * refW;
        const totalH = rows * refH;

        const padding = 0.9;
        const scaleX = (stageSize.width * padding) / totalW;
        const scaleY = (stageSize.height * padding) / totalH;
        setZoom(Math.min(scaleX, scaleY));
        setPan({x: 0, y: 0});
    }
  };

  const handleDownload = () => {
    if (canvasImage && canvasImage.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = canvasImage;
      link.download = `anh-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Navigate between images
  const navigateImage = (direction: 'prev' | 'next') => {
    if (savedHistory.length === 0) return;
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = (currentIndex - 1 + savedHistory.length) % savedHistory.length;
    } else {
      newIndex = (currentIndex + 1) % savedHistory.length;
    }
    setCurrentIndex(newIndex);
    setCanvasImage(savedHistory[newIndex].imageUrl);
    // Reset zoom/pan for new image if in single view
    if (viewMode === 'single') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }
  };

  // Pinch to zoom
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      setLastPinchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance !== null) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      const scale = distance / lastPinchDistance;
      const newZoom = Math.max(0.05, Math.min(10, zoom * scale));
      setZoom(newZoom);
      setLastPinchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setLastPinchDistance(null);
  };

  // Helper to calculate centering offset
  const getCenteredOffset = (contentWidth: number, contentHeight: number) => {
      const x = (stageSize.width / zoom - contentWidth) / 2;
      const y = (stageSize.height / zoom - contentHeight) / 2;
      return { x, y };
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="p-2 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left - Zoom controls */}
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)} className="h-8 w-8 p-0">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)} className="h-8 w-8 p-0">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="h-8 w-8 p-0">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Center - Navigation (Only visible in single view or if we allow navigating history even in grid) */}
          {savedHistory.length > 1 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateImage('prev')} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500">{currentIndex + 1}/{savedHistory.length}</span>
              <Button variant="outline" size="sm" onClick={() => navigateImage('next')} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Right - Actions */}
          <div className="flex items-center space-x-1">
            {/* View mode toggle */}
            <Button
              variant={viewMode === 'grid' ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                const newMode = viewMode === 'grid' ? 'single' : 'grid';
                setViewMode(newMode);
                // Reset zoom when switching modes
                setZoom(1);
                setPan({x:0, y:0});
              }}
              className="h-8 w-8 p-0"
              title={viewMode === 'grid' ? "Xem đơn" : "Xem lưới 2x2"}
            >
              {viewMode === 'grid' ? <Maximize2 className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            {(canvasImage) && (
              <>
                <Button
                  variant={showEditPanel ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowEditPanel(!showEditPanel)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setShowEditPanel(!showEditPanel);
                  }}
                  className="h-8 px-2 touch-manipulation"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="ml-1 text-xs">Sửa</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 w-8 p-0">
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {showEditPanel && canvasImage && (
        <EditPanel onClose={() => setShowEditPanel(false)} />
      )}

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-200 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {savedHistory.length === 0 && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="text-5xl mb-3">🖼️</div>
              <p className="text-gray-500 text-sm">Chưa có ảnh nào</p>
              <p className="text-gray-400 text-xs mt-1">Tạo ảnh mới để bắt đầu</p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-3 mx-auto" />
              <p className="text-gray-700 text-sm">Đang tạo ảnh...</p>
              <p className="text-gray-400 text-xs mt-1">{elapsedTime}s</p>
            </div>
          </div>
        )}

        {/* Unified Stage for both Single and Grid view to support Zoom/Pan */}
        {(viewMode === 'single' ? singleImage : gridImages.length > 0) && (
             <Stage
                ref={stageRef}
                width={stageSize.width}
                height={stageSize.height}
                scaleX={zoom}
                scaleY={zoom}
                x={pan.x * zoom}
                y={pan.y * zoom}
                draggable={true}
                onDragEnd={(e) => {
                  setPan({
                    x: e.target.x() / zoom,
                    y: e.target.y() / zoom
                  });
                }}
                style={{ cursor: 'grab' }}
              >
                <Layer>
                   {/* Grid View Content */}
                   {viewMode === 'grid' && (() => {
                       // Calculate grid dimensions to center it
                       if(gridImages.length === 0) return null;
                       const refW = gridImages[0].image.width;
                       const refH = gridImages[0].image.height;
                       const cols = Math.min(gridImages.length, 2);
                       const rows = Math.ceil(gridImages.length / 2);
                       const gridW = cols * refW;
                       const gridH = rows * refH;
                       const { x: offX, y: offY } = getCenteredOffset(gridW, gridH);

                       return (
                           <Group x={offX} y={offY}>
                               {gridImages.map((imgData, i) => {
                                   const isCurrent = imgData.item.imageUrl === canvasImage;

                                   return (
                                     <Group
                                        key={imgData.item.id}
                                        x={imgData.x}
                                        y={imgData.y}
                                        onClick={() => {
                                            setCanvasImage(imgData.item.imageUrl);
                                            // Update index
                                            const idx = savedHistory.findIndex(h => h.id === imgData.item.id);
                                            if(idx !== -1) setCurrentIndex(idx);
                                        }}
                                        onTap={() => {
                                            setCanvasImage(imgData.item.imageUrl);
                                            const idx = savedHistory.findIndex(h => h.id === imgData.item.id);
                                            if(idx !== -1) setCurrentIndex(idx);
                                        }}
                                     >
                                        <KonvaImage image={imgData.image} />
                                        {/* Selection Border */}
                                        {isCurrent && (
                                            <Rect
                                                width={imgData.image.width}
                                                height={imgData.image.height}
                                                stroke="#9333ea" // purple-600
                                                strokeWidth={10}
                                            />
                                        )}
                                     </Group>
                                   );
                               })}
                           </Group>
                       );
                   })()}

                   {/* Single View Content */}
                   {viewMode === 'single' && singleImage && (() => {
                        const { x, y } = getCenteredOffset(singleImage.width, singleImage.height);
                        return (
                            <KonvaImage
                                image={singleImage}
                                x={x}
                                y={y}
                            />
                        );
                   })()}
                </Layer>
             </Stage>
        )}
      </div>

      {/* Bottom info - Current image prompt */}
      {savedHistory[currentIndex] && (
        <div className="p-2 bg-white border-t border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-600 line-clamp-2">
            {savedHistory[currentIndex].prompt}
          </p>
        </div>
      )}
    </div>
  );
};