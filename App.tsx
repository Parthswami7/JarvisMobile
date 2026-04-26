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
      releaseAllLlama();
    };
  }, []);

  const loadBrain = async () => {
    try {
      setChat("Opening file manager...");
      const [res] = await pick({ type: [types.allFiles] });
      setChat("Installing brain... Please wait.");
      const destPath = `${RNFS.DocumentDirectoryPath}/jarvis_brain.gguf`;
      const exists = await RNFS.exists(destPath);
      if (exists) await RNFS.unlink(destPath);
      await RNFS.copyFile(res.uri, destPath);
      const ctx = await initLlama({ model: destPath });
      setContext(ctx);
      setChat("JARVIS is online, sir.");
      Tts.speak("I am online and ready.");
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        setChat("Installation cancelled.");
      } else {
        setChat(`Error: ${err.message}`);
      }
    }
  };

  const startListening = async () => {
    if (!context) return setChat("Load a brain first!");
    setIsListening(true);
    try { await Voice.start('en-US'); } catch (e) { setChat("Mic error. Check permissions."); }
  };

  const stopListening = async () => {
    setIsListening(false);
    try { await Voice.stop(); } catch (e) { console.error(e); }
  };

  const processCommand = async (text: string) => {
    if (!context) return;
    setChat("Thinking...");

    // THE DEVICE DIRECTORY
    const devices: { [key: string]: string } = {
      "PC": "192.168.1.17", // Your Lenovo PC in Sikar
      "TABLET": "192.168.1.X", // Replace with your tablet's IP later
      "PHONE": "192.168.1.Y"   // Replace with your other phone's IP later
    };

    try {
      // THE UPGRADED PROMPT
      const response = await context.completion({
        prompt: `System: You are JARVIS. If the user gives a device command, reply ONLY with this exact format: [CMD: DEVICE_NAME : ACTION]. Devices: PC, TABLET, PHONE. Actions: LOCK, SHUTDOWN, YOUTUBE, SLEEP. Example: If user says "Shut down my PC", reply "[CMD: PC : SHUTDOWN]".\nUser: ${text}\nJARVIS:`,
        n_predict: 50,
      });

      const aiText = response.text.trim();

      // THE DYNAMIC INTERCEPTOR
      const cmdMatch = aiText.match(/\[CMD:\s*([A-Z]+)\s*:\s*([A-Z_]+)\]/);

      if (cmdMatch) {
        const targetDevice = cmdMatch[1];
        const action = cmdMatch[2];
        const targetIP = devices[targetDevice];

        if (targetIP) {
          setChat(`JARVIS: Executing ${action} protocol on ${targetDevice}, sir.`);
          Tts.speak(`Accessing ${targetDevice} now.`);

          // Fire the command to the specific device's IP
          fetch(`http://${targetIP}:5000/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action.toLowerCase() })
          }).catch(err => setChat(`${targetDevice} appears to be offline or unreachable.`));

        } else {
          setChat(`JARVIS: I don't have an IP address configured for ${targetDevice} yet.`);
          Tts.speak(`I do not have an IP address for that device.`);
        }
      } else {
        // Normal conversation flow
        setChat(`JARVIS: ${aiText}`);
        Tts.speak(aiText);
      }

    } catch (err) {
      setChat("Neural net error.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JARVIS Mobile</Text>
      <ScrollView style={styles.chatBox}><Text style={styles.text}>{chat}</Text></ScrollView>
      {!context ? (
        <TouchableOpacity style={styles.loadButton} onPress={loadBrain}>
          <Text style={styles.buttonText}>Load JARVIS Brain (.gguf)</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, isListening && styles.buttonActive]}
          onPressIn={startListening} onPressOut={stopListening}>
          <Text style={styles.buttonText}>{isListening ? "Listening..." : "Hold to Speak"}</Text>
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
  loadButton: { width: '80%', padding: 20, backgroundColor: '#003366', borderRadius: 10, alignItems: 'center' },
  button: { width: '80%', padding: 20, borderWidth: 2, borderColor: '#00ff00', borderRadius: 10, alignItems: 'center' },
  buttonActive: { backgroundColor: '#004400' },
  buttonText: { color: '#00ff00', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' }
});