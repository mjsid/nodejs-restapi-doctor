var express = require("express");
var router = express.Router();
const path = require("path");
const { sendOTP } = require('./utils');

var twilio = require("twilio");

const TWILIO_ACCOUNT_SID = "AC9a2fc5719dd0c67761f4fd3239e304f9";
const TWILIO_API_KEY = "SK22536d13a6b8180ffa7dab25001887f9";
const TWILIO_API_SECRET = "tidc0qYDF2nU16Z8KtIdkkrndMKCfcTm";

// const TWILIO_AUTH_TOKEN = "1d5148422ae2ef5548c28171667e5943";
// const client = new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

var AccessToken = twilio.jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;

router.get("/token", (req, res, next) => {
  console.log("***************TWILIO TOKEN API****************");
  console.log(req.query);
  var identity = req.query.identity;
  var mobile = req.query.mobile;
  var doctor_name = req.query.doctor_name;
  try {
    var token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET
    );
    console.log(token);

    // Assign the generated identity to the token
    token.identity = identity;

    const grant = new VideoGrant();
    // Grant token access to the Video API features
    token.addGrant(grant);

    console.log(token);
    const message = `DotRx: Your scheduled video appointment has been started by ${doctor_name}, Please open app to join.`;
    sendOTP(null, mobile, message);
    res.status(200).json({
      code: 200,
      identity: identity,
      jwt: token.toJwt(),
    });
  } catch (err) {
    console.log("Error in generating token.", err);
    res.status(200).json({
      code: 200,
      message: `Error in generating token.${err}`,
    });
  }
});

module.exports = router;
