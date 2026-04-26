import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { initLlama, releaseAllLlama } from 'llama.rn';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';

export default function App() {
  const [chat, setChat] = useState<string>("Awaiting brain installation, sir.");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [context, setContext] = useState<any>(null);

  useEffect(() => {
    // 1. Setup Voice Recognition
    Voice.onSpeechResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        const userText = e.value[0];
        setChat(`You: ${userText}`);
        processCommand(userText);
      }
    };
    
    Tts.setDefaultLanguage('en-US');

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      if (context) releaseAllLlama();
    };
  }, [context]);

  // 2. Setup the Modern Brain Loader
  const loadBrain = async () => {
    try {
      setChat("Opening file manager...");
      
      // NEW: Modern syntax for the updated document picker
      const [res] = await pick({
        type: [types.allFiles],
      });
      
      setChat("Installing brain into secure sector... Please wait.");
      
      // Copy the .gguf file into the app's secure internal storage
      const destPath = `${RNFS.DocumentDirectoryPath}/jarvis_brain.gguf`;
      const exists = await RNFS.exists(destPath);
      if (exists) await RNFS.unlink(destPath);
      
      await RNFS.copyFile(res.uri, destPath);

      setChat("Initializing neural net...");
      const ctx = await initLlama({ model: destPath });
      setContext(ctx);
      
      setChat("JARVIS is fully online and ready, sir.");
      Tts.speak("I am online and ready.");
      
    } catch (err: any) {
      // NEW: Modern error handling for the updated picker
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        setChat("Brain installation cancelled.");
      } else {
        setChat(`Error loading brain: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const startListening = async () => {
    if (!context) return setChat("Please load a brain file first!");
    setIsListening(true);
    try {
      await Voice.start('en-US');
    } catch (e) {
      setChat("Microphone error. Check permissions.");
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    try {
      await Voice.stop();
    } catch (e) {
      console.error(e);
    }
  };

  const processCommand = async (text: string) => {
    if (!context) return;
    setChat("JARVIS is thinking...");
    
    try {
      const response = await context.completion({
        prompt: `System: You are JARVIS, a helpful AI. Keep answers short.\nUser: ${text}\nJARVIS:`,
        n_predict: 50,
      });

      const aiText = response.text;
      setChat(`JARVIS: ${aiText}`);
      Tts.speak(aiText);
    } catch (err) {
      setChat("Error connecting to neural net.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JARVIS Mobile</Text>
      
      <ScrollView style={styles.chatBox}>
        <Text style={styles.text}>{chat}</Text>
      </ScrollView>

      {!context && (
        <TouchableOpacity style={styles.loadButton} onPress={loadBrain}>
          <Text style={styles.buttonText}>Load JARVIS Brain (.gguf)</Text>
        </TouchableOpacity>
      )}
      
      {context && (
        <TouchableOpacity 
          style={[styles.button, isListening && styles.buttonActive]}
          onPressIn={startListening}
          onPressOut={stopListening}
        >
          <Text style={styles.buttonText}>
            {isListening ? "Listening..." : "Hold to Speak"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', paddingTop: 50, paddingBottom: 30 },
  title: { color: '#00ff00', fontSize: 30, fontWeight: 'bold', marginBottom: 20, fontFamily: 'monospace' },
  chatBox: { flex: 1, width: '90%', backgroundColor: '#161b22', padding: 15, borderRadius: 5, borderWidth: 1, borderColor: '#00ff00', marginBottom: 20 },
  text: { color: '#00ff00', fontSize: 16, fontFamily: 'monospace' },
  loadButton: { width: '80%', padding: 20, backgroundColor: '#003366', borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  button: { width: '80%', padding: 20, borderWidth: 2, borderColor: '#00ff00', borderRadius: 10, alignItems: 'center' },
  buttonActive: { backgroundColor: '#004400' },
  buttonText: { color: '#00ff00', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }
});