/**
 * Netlify Serverless Function: generate-speech
 *
 * Secure server-side proxy for ElevenLabs Text-to-Speech API.
 * Keeps the ELEVENLABS_API_KEY secret on the server so it is never exposed in browser code.
 *
 * Supported Methods:
 * - POST: Synthesizes text to speech using ElevenLabs TTS model and returns audio/mpeg.
 * - GET:  Fetches account voices or verifies that the backend is connected and configured.
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, xi-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  const httpMethod = (
    event.httpMethod ||
    event.method ||
    event.requestContext?.http?.method ||
    ''
  ).toUpperCase();

  // Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Handle unsupported HTTP methods
  if (httpMethod !== 'GET' && httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Allow': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Missing ELEVENLABS_API_KEY environment variable. Configure it in Netlify Site Settings > Environment variables or in your local .env file.'
      })
    };
  }

  // GET: Health check & voices sync
  if (httpMethod === 'GET') {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          statusCode: response.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `ElevenLabs API error (${response.status}): ${errorText}`
          })
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ok',
          voices: data.voices || []
        })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: err.message || 'Failed to fetch voices from ElevenLabs'
        })
      };
    }
  }

  // POST: Text-to-Speech Generation
  if (httpMethod === 'POST') {
    try {
      let bodyData = {};
      try {
        if (typeof event.json === 'function') {
          bodyData = await event.json();
        } else if (typeof event.body === 'object' && event.body !== null) {
          bodyData = event.body;
        } else if (typeof event.body === 'string') {
          const raw = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf-8')
            : event.body;
          bodyData = JSON.parse(raw || '{}');
        }
      } catch (parseErr) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid JSON request payload.' })
        };
      }

      const { text, voiceId, model_id, voice_settings } = bodyData;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Text content is required for narration.' })
        };
      }

      const targetVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel
      const targetModelId = model_id || 'eleven_multilingual_v2';

      const payload = {
        text: text.trim(),
        model_id: targetModelId,
        voice_settings: voice_settings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      };

      const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(payload)
      });

      if (!elevenResponse.ok) {
        let errorMessage = `ElevenLabs API error (${elevenResponse.status})`;
        try {
          const errData = await elevenResponse.json();
          if (errData.detail?.message) {
            errorMessage = errData.detail.message;
          } else if (errData.message) {
            errorMessage = errData.message;
          }
        } catch (_) {
          errorMessage = elevenResponse.statusText || errorMessage;
        }

        return {
          statusCode: elevenResponse.status,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: errorMessage })
        };
      }

      const audioBuffer = await elevenResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: base64Audio,
        isBase64Encoded: true
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: err.message || 'Server error while generating speech.'
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Allow': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};
