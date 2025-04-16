import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import './App.css'; 

const App = () => {
  const [recording, setRecording] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [inputMode, setInputMode] = useState("mic");
  const [audioFileURL, setAudioFileURL] = useState(null);
  const [fileName, setFileName] = useState("");
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const pitchShiftRef = useRef(null);
  const micRef = useRef(null);
  const playerRef = useRef(null);
  const destinationRef = useRef(null);
  const ffmpegRef = useRef(null);

  useEffect(() => {
    ffmpegRef.current = new FFmpeg({ log: true });
    ffmpegRef.current.load().then(() => {
      setFfmpegLoaded(true);
    });
  }, []);

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

    if (inputMode === "file" && playerRef.current) {
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

  const handleStopRecording = async () => {
    const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
    recordedChunksRef.current = [];

    if (!ffmpegLoaded) {
      console.error("FFmpeg is not loaded yet.");
      return;
    }

    try {
      const inputData = await fetchFile(blob);
      await ffmpegRef.current.writeFile('input.webm', inputData);

      await ffmpegRef.current.exec([
        '-i', 'input.webm',
        '-vn',
        '-ar', '44100',
        '-ac', '2',
        '-b:a', '192k',
        'output.mp3'
      ]);

      const mp3Data = await ffmpegRef.current.readFile('output.mp3');
      const mp3Blob = new Blob([mp3Data.buffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(mp3Blob);
      setAudioURL(url);

    } catch (error) {
      console.error("Error converting to MP3:", error);
    }
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
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setAudioFileURL(url);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Tuned</h1>

      <div className="mode-selector">
        <label className="mode-option">
          <input
            type="radio"
            value="mic"
            checked={inputMode === "mic"}
            onChange={handleInputModeChange}
          />
          Microphone
        </label>
        <label className="mode-option">
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
        <div className="file-input">
          <label htmlFor="file-upload" className="custom-file-upload">
            Choose File
          </label>
          <input
            id="file-upload"
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
          />
          {fileName && (
            <div className="file-info">
              <p>Uploaded: <span>{fileName}</span></p>
            </div>
          )}
        </div>
      )}

      {!recording ? (
        <button
          className="action-btn"
          onClick={startRecording}
          disabled={inputMode === "file" && !audioFileURL}
        >
          {inputMode === "mic" ? "Start Recording" : "Start Processing"}
        </button>
      ) : (
        <button className="action-btn stop" onClick={stopRecording}>
          Stop Recording
        </button>
      )}

      <div className="slider-container">
        <label className="slider-label">
          Pitch Shift (Semitones): {pitch}
        </label>
        <input
          className="slider"
          type="range"
          min="-12"
          max="12"
          step="0.1"
          value={pitch}
          onChange={handlePitchChange}
        />
      </div>

      {audioURL && (
        <div className="audio-output">
          <h2>Output Preview</h2>
          <audio src={audioURL} controls />
          <br />
          <a className="download-link" href={audioURL} download="tuned_output.mp3">
            Download Output
          </a>
        </div>
      )}

      <footer className="footer">
        Made by Quang
      </footer>
    </div>
  );
};

export default App;
