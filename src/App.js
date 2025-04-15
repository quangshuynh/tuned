import React, { useState, useRef } from 'react';
import * as Tone from 'tone';

const App = () => {
  const [recording, setRecording] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [audioURL, setAudioURL] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const pitchShiftRef = useRef(null);
  const micRef = useRef(null);
  const destinationRef = useRef(null);

  const startRecording = async () => {
    await Tone.start();

    micRef.current = new Tone.UserMedia();
    await micRef.current.open();

    pitchShiftRef.current = new Tone.PitchShift({
      pitch, 
    });

    destinationRef.current = Tone.getContext().createMediaStreamDestination();

    micRef.current.connect(pitchShiftRef.current);
    
    pitchShiftRef.current.toDestination();
  
    pitchShiftRef.current.connect(destinationRef.current);

    mediaRecorderRef.current = new MediaRecorder(destinationRef.current.stream);
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    mediaRecorderRef.current.onstop = handleStopRecording;
    mediaRecorderRef.current.start();

    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (micRef.current) {
      micRef.current.close();
    }
    setRecording(false);
  };

  const handleStopRecording = () => {
    const blob = new Blob(recordedChunksRef.current, {
      type: 'audio/webm'
    });
    const url = URL.createObjectURL(blob);
    setAudioURL(url);
    recordedChunksRef.current = [];
  };

  const handlePitchChange = (e) => {
    const newPitch = parseFloat(e.target.value);
    setPitch(newPitch);
    if (pitchShiftRef.current) {
      pitchShiftRef.current.pitch = newPitch;
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Tuned - Voice Effects Studio</h1>
      
      {!recording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}
      <div style={{ marginTop: '1rem' }}>
        <label>Pitch Shift (Semitones): {pitch}</label>
        <br />
        <input
          type="range"
          min="-12"
          max="12"
          step="0.1"
          value={pitch}
          onChange={handlePitchChange}
        />
      </div>
      {audioURL && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Recording Preview</h2>
          <audio src={audioURL} controls />
          <br />
          <a href={audioURL} download="tuned_recording.webm">Download Recording</a>
        </div>
      )}
    </div>
  );
};

export default App;
