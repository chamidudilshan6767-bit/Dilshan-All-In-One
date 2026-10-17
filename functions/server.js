const express = require('express');
const serverless = require('serverless-http');
const app = express();

// අපේ පැරණි server.js එකේ routes සහ logic මෙතනට සම්බන්ධ වේ
const serverApp = require('../server.js');

module.exports.handler = serverless(serverApp);
