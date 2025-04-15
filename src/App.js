import React, { useState, useRef } from 'react';
import * as Tone from 'tone';

const App = () => {
  const [recording, setRecording] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [inputMode, setInputMode] = useState("mic"); 
  const [audioFileURL, setAudioFileURL] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const pitchShiftRef = useRef(null);
  const micRef = useRef(null);
  const playerRef = useRef(null);
  const destinationRef = useRef(null);

  const startRecording = async () => {
    await Tone.start();

    pitchShiftRef.current = new Tone.PitchShift({ pitch });
    destinationRef.current = Tone.getContext().createMediaStreamDestination();

    if (inputMode === "mic") {
      micRef.current = new Tone.UserMedia();
      await micRef.current.open();
      micRef.current.connect(pitchShiftRef.current);
    } else if (inputMode === "file" && audioFileURL) {
      playerRef.current = new Tone.Player();
      await playerRef.current.load(audioFileURL);
      playerRef.current.connect(pitchShiftRef.current);
    } else {
      console.error("No audio file selected!");
      return;
    }

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

    if (inputMode === "file") {
      playerRef.current.start();
    }

    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (inputMode === "mic" && micRef.current) {
      micRef.current.close();
    }
    if (inputMode === "file" && playerRef.current) {
      playerRef.current.stop();
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

  const handleInputModeChange = (e) => {
    setInputMode(e.target.value);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setAudioFileURL(url);
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Tuned</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input
            type="radio"
            value="mic"
            checked={inputMode === "mic"}
            onChange={handleInputModeChange}
          />
          Microphone
        </label>
        <label style={{ marginLeft: '1rem' }}>
          <input
            type="radio"
            value="file"
            checked={inputMode === "file"}
            onChange={handleInputModeChange}
          />
          Audio File
        </label>
      </div>

      {inputMode === "file" && (
        <div style={{ marginBottom: '1rem' }}>
          <input type="file" accept="audio/*" onChange={handleFileChange} />
        </div>
      )}

      {!recording ? (
        <button onClick={startRecording} disabled={inputMode === "file" && !audioFileURL}>
          {inputMode === "mic" ? "Start Recording" : "Start Processing"}
        </button>
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
          <h2>Output Preview</h2>
          <audio src={audioURL} controls />
          <br />
          <a href={audioURL} download="tuned_output.webm">
            Download Output
          </a>
        </div>
      )}
    </div>
  );
};

export default App;
