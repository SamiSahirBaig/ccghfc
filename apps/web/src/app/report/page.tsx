'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  FileText,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Sparkles,
  ShieldCheck,
  Clock,
  Mic,
} from 'lucide-react';
import CameraCapture from '@/components/camera/CameraCapture';
import LeafletMap from '@/components/map/LeafletMap';
import { ApiClient } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

export default function ReportPage() {
  const router = useRouter();
  const { user, draft, saveDraft, clearDraft } = useAppStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);

  // Form State
  const [photos, setPhotos] = useState<File[]>([]);
  const [title, setTitle] = useState(draft?.title || '');
  const [description, setDescription] = useState(draft?.description || '');
  const [categoryId, setCategoryId] = useState(draft?.categoryId || '');
  const [selfSeverity, setSelfSeverity] = useState(5);
  const [voiceNote, setVoiceNote] = useState('');
  const [landmark, setLandmark] = useState(draft?.landmark || '');
  const [address, setAddress] = useState(draft?.address || 'Connaught Place, New Delhi');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: draft?.latitude || 28.6139,
    lng: draft?.longitude || 77.2090,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load categories
    ApiClient.get('/admin/categories')
      .then((res) => {
        if (res.data) {
          setCategories(res.data);
          if (!categoryId && res.data.length > 0) {
            setCategoryId(res.data[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback default categories
        setCategories([
          { id: 'cat-1', name: 'Garbage Pileup & Illegal Dumping' },
          { id: 'cat-2', name: 'Sewage Blockage & Overflowing Drains' },
          { id: 'cat-3', name: 'Dead Animal Removal' },
          { id: 'cat-4', name: 'Burning Waste & Toxic Smoke' },
          { id: 'cat-5', name: 'Foul Gas / Air Quality Hazard (IoT)' },
        ]);
      });
  }, []);

  // Save draft whenever details change (offline draft persistence requirement)
  useEffect(() => {
    saveDraft({
      title,
      description,
      categoryId,
      latitude: coords.lat,
      longitude: coords.lng,
      address,
      landmark,
      photosBase64: [],
    });
  }, [title, description, categoryId, coords, address, landmark]);

  // Auto-detect browser GPS location
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        // Reverse-geocode via Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const geo = await res.json();
          if (geo.display_name) {
            setAddress(geo.display_name);
          }
        } catch (e) {
          // ignore
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert(`Location permission denied or unavailable: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePinDrag = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const geo = await res.json();
      if (geo.display_name) {
        setAddress(geo.display_name);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !categoryId) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('categoryId', categoryId);
    formData.append('latitude', coords.lat.toString());
    formData.append('longitude', coords.lng.toString());
    formData.append('address', address);
    if (landmark) formData.append('landmark', landmark);
    if (selfSeverity) formData.append('selfSeverity', selfSeverity.toString());
    if (voiceNote) formData.append('voiceNote', voiceNote);

    photos.forEach((photo) => {
      formData.append('photos', photo);
    });

    try {
      const res = await ApiClient.post('/complaints', formData);
      if (res.success && res.data) {
        setSubmissionResult(res.data);
        clearDraft();
      } else {
        throw new Error(res.error?.message || 'Failed to submit report');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN: Shows Complaint ID, SLA countdown, AI Verification status
  if (submissionResult) {
    const isSpam = submissionResult.aiVerification?.decision === 'REJECTED_SPAM';
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Complaint Registered Successfully!</h1>
            <p className="text-xs text-slate-500 mt-1">
              Your grievance has been validated by AI and logged in the municipal accountability system.
            </p>
          </div>

          {/* Key Identifiers */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 text-left">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Complaint Code</span>
              <span className="text-base font-extrabold text-slate-900 font-mono tracking-wider">{submissionResult.publicCode}</span>
            </div>

            {/* SLA Countdown Badge */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Statutory SLA Target</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                <span>72 Hours (3-Day Resolution)</span>
              </div>
            </div>

            {/* AI Verification Status Chip */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase">AI Inspection Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isSpam ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {submissionResult.aiVerification?.decision || 'VERIFIED'}
                </span>
              </div>
              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 italic">
                &ldquo;{submissionResult.aiVerification?.reasoning || 'Authentic civic defect verified with valid street geometry.'}&rdquo;
              </p>
            </div>

            {/* Emergency Priority Score */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Urgency Score</span>
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-orange-100 text-orange-800">
                {submissionResult.priorityLabel} ({submissionResult.priorityScore}/100)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => router.push(`/complaints/${submissionResult.complaintId}`)}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20"
            >
              Track Progress & Timeline &rarr;
            </button>
            <button
              onClick={() => {
                setSubmissionResult(null);
                setCurrentStep(1);
                setPhotos([]);
                setTitle('');
                setDescription('');
              }}
              className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 md:py-10">
      {/* Stepper Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between relative mb-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 transition-all duration-300 z-0"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          />

          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                currentStep >= step
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-white text-slate-400 border-2 border-slate-200'
              }`}
            >
              {step === 1 ? <Camera className="w-4 h-4" /> : step === 2 ? <FileText className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
          <span className={currentStep === 1 ? 'text-emerald-700' : ''}>1. Photo Evidence</span>
          <span className={currentStep === 2 ? 'text-emerald-700' : ''}>2. Defect Details</span>
          <span className={currentStep === 3 ? 'text-emerald-700' : ''}>3. Exact Location</span>
        </div>
      </div>

      {/* Main Stepper Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-lg space-y-6">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: PHOTO CAPTURE */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 1: Capture Photo Evidence</h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload 1 to 4 clear photos of the civic problem. Photos are compressed client-side and analyzed by AI.
              </p>
            </div>

            <CameraCapture onPhotosChange={(files) => setPhotos(files)} maxPhotos={4} />

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <span>Next: Issue Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS & CATEGORY */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 2: Grievance Details</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select the civic category and describe the sanitation defect.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Civic Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Issue Title *</label>
              <input
                type="text"
                placeholder="e.g. Uncollected garbage pile blocking pedestrian path"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Detailed Description *</label>
              <textarea
                rows={3}
                placeholder="Describe volume of waste, sewage blockage, foul odors, or health hazards..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Severity Self-Rating (1-10) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Urgency Self-Rating: {selfSeverity}/10</label>
                <span className="text-[11px] font-bold text-orange-600">
                  {selfSeverity >= 8 ? 'Critical Hazard' : selfSeverity >= 5 ? 'Moderate' : 'Low'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={selfSeverity}
                onChange={(e) => setSelfSeverity(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Voice Note Text Hook */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-600" />
                <span>Voice Note Transcribed Text (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Add speech-to-text notes or audio observations..."
                value={voiceNote}
                onChange={(e) => setVoiceNote(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <span>Next: Pin Location</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & SUBMIT */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 3: Pin Location & Submit</h2>
              <p className="text-xs text-slate-500 mt-1">
                Drag the marker to the exact spot. Address will auto-fill from OpenStreetMap.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAutoDetectLocation}
                disabled={isLocating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
              >
                <Navigation className={`w-3.5 h-3.5 text-emerald-600 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Detecting GPS...' : 'Auto-Detect My GPS Location'}</span>
              </button>
            </div>

            {/* Draggable Map Component */}
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <LeafletMap
                center={[coords.lat, coords.lng]}
                zoom={15}
                draggablePin={coords}
                onPinDragEnd={handlePinDrag}
                className="h-[220px] w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Detected Address *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nearby Landmark (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Opposite Metro Pillar 142 / Near Mother Dairy"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            {/* Statutory SLA Guarantee Notice */}
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Statutory 72-Hour Resolution Guarantee:</strong>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  If this defect is not resolved by municipal staff within 72 hours, it will automatically escalate directly to the District Magistrate office with full evidence.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>AI Analyzing & Registering...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Grievance Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
