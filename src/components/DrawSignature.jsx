import React, { useRef, useState, useEffect } from 'react';
import { PenLine, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function DrawSignature({ onSign, isLoading, userName, documentType = 'leieavtale' }) {
  const [showDialog, setShowDialog] = useState(false);
  const [signed, setSigned] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  };

  const stopDraw = () => { drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = async () => {
    setSigned(true);
    await new Promise(r => setTimeout(r, 800));
    const signRef = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    onSign(signRef);
    setShowDialog(false);
    setSigned(false);
    setHasDrawn(false);
  };

  const handleOpen = () => {
    setShowDialog(true);
    setHasDrawn(false);
    setSigned(false);
    // Clear canvas on next tick after dialog renders
    setTimeout(() => {
      if (canvasRef.current) clearCanvas();
    }, 50);
  };

  return (
    <>
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <PenLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Signer avtalen</h3>
              <p className="text-sm text-blue-700">Tegn signaturen din</p>
            </div>
          </div>
          <p className="text-sm text-blue-800 mb-4">
            Signer {documentType}en ved å tegne signaturen din med finger eller mus.
          </p>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleOpen}
            disabled={isLoading}
          >
            <PenLine className="w-4 h-4 mr-2" />
            Signer {documentType}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-blue-600" />
              Signer {documentType}
            </DialogTitle>
            <DialogDescription>
              Tegn signaturen din nedenfor som {userName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {signed ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-green-700 font-medium">Signatur registrert!</p>
              </div>
            ) : (
              <div>
                <div className="border-2 border-dashed border-blue-300 rounded-xl bg-white overflow-hidden relative">
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={160}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400 text-sm">Tegn signaturen din her...</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={!hasDrawn}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Tøm
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!signed && (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Avbryt</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleConfirm}
                  disabled={!hasDrawn}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Bekreft signatur
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}