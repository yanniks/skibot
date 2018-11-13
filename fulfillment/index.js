// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
// Bibliothek für Netzwerkaufrufe
const axios = require('axios');

// Standardimporte
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  
  /**
   * Lädt den Link zur Skikarte des entsprechenden Skigebiets und sendet die Antwort an Dialogflow
   */
  function holeSkikarte(agent, skiMaps, website) {
      if (skiMaps.length < 1) {
          agent.add("Leider konnte ich keine Karte für das Skigebiet finden.");
          return;
      }
      
      // Lädt die Skikarten-XML herunter, auf Basis der als ersten definierten Karte für das Resort
      return axios.get(`https://skimap.org/SkiMaps/view/${skiMaps[0].id}.xml`)
      .then((res) => {
          // Enthält alle Daten des XMLs als String
          const txt = res.data;
          
          // Karten-URL aus XML rausparsen
          const urlSplit = txt.split("url=\"");
          const bildUrl = urlSplit[urlSplit.length - 2].split("\"")[0];
          
          // Karte für Dialogflow zusammenbauen
          agent.add(new Card({
              title: `Skigebietskarte`,
              imageUrl: bildUrl,
              text: `Diese Karte habe ich für dich gefunden. Und jetzt ab in den Schnee! ❄️`,
              buttonText: 'Website',
              buttonUrl: website,
              }));
        });
  }
  
  /**
   * Lädt die Resortinformationen auf Basis der von Dialogflow angebotenen Daten
   */ 
  function skimapIntent(agent) {
      // Lädt die Skiresort-Informationen runter, auf Basis der Skiresort-ID aus Dialogflow
      return axios.get(`https://skimap.org/SkiAreas/view/${agent.parameters.skiresort}.json`)
      .then((res) => {
          return holeSkikarte(agent, res.data.ski_maps, res.data.official_website);
      });
  }

  // Map, welche alle Intents mit Namen und Handling-Funktion enthält
  let intentMap = new Map();
  intentMap.set('zeigeKarte', skimapIntent);
  agent.handleRequest(intentMap);
});

