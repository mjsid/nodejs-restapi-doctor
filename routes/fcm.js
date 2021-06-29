var admin = require("firebase-admin");

var serviceAccount = require("./ServiceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

function sendNotification(title, body, token){
    console.log(title,body);
    var payload = {
  notification: {
    title: title,
    body: body
  },
  data: {
    title: title,
    body: body
  }
};

 var options = {
  priority: "high",
  timeToLive: 60 * 60 *24
};

admin.messaging().sendToDevice(token, payload, options)
  .then(function(response) {
    console.log("Successfully sent message:", response);
  })
  .catch(function(error) {
    console.log("Error sending message:", error);
  });
}

module.exports = sendNotification;