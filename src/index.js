var express = require("express");
const app = express();
const bodyParser = require("body-parser");
const request = require("request");
const Track = require("./ems-tracker/Track");

const port = process.env.PORT || 80;

const pushToLine = (userId, message,cb) => {
  request.post(
    {
      rejectUnauthorized: false,
      url: "https://api.line.me/v2/bot/message/push",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineBearer}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      })
    },(error, response, body)=>
   cb(error, response, body)
    
  );
};

const apiBase = "/src";

const token = process.env.POSTALTOKEN
const lineBearer = process.env.LINETOKEN
const postalBearer = process.env.POSTALBEARER

app.use(bodyParser.json());

app.post(`${apiBase}/addtracking`, (req, res) => {
  request.post(
    {
      rejectUnauthorized: false,
      url: "https://trackwebhook.thailandpost.co.th/post/api/v1/hook",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`
      },
      body: JSON.stringify({
        status: "all",
        language: "TH",
        barcode: req.body.code
      })
    },
    (error, response, body) => {
      console.log(error, response, body);
      res.send(error, response, body);
    }
  );
});

app.post(
  `${apiBase}/postal/webhook`,
  function(req, res, next) {
    if (req.header("Authorization") == `Bearer ${postalBearer}`) {
      next();
    } else {
      res.status(403).send("Unauthorized");
    }
  },
  (req, res) => {
    console.log(Track.readTrack(req.body.items[0].barcode));
    Track.readTrack(req.body.items[0].barcode).then(r =>
      pushToLine(
        r[0].lineid,
         `ขณะนี้พัสดุของคุณอยู่ในสถานะ${req.body.items[0].status_description} ที่ที่ทำการไปรษณีย์${req.body.items[0].location}`,
         (error, response, body) => {
            res.send('OK')
         }
      )
    );
  }
);

app.post(`${apiBase}/line/webhook`, (req, res) => {
  request.post(
    {
      rejectUnauthorized: false,
      url: "https://trackwebhook.thailandpost.co.th/post/api/v1/hook",
      headers: {
        "Content-Type": "application/json",
        authorization: `Token ${token}`
      },
      body: JSON.stringify({
        status: "all",
        language: "TH",
        barcode: [req.body.events[0].message.text]
      })
    },
    (error, response, body) => {
      console.log(JSON.parse(body));
      let userId = req.body.events[0].source.userId;
      let trackingnumber = req.body.events[0].message.text;
      if (JSON.parse(body).status) {
        Track.addTrack(userId, trackingnumber);
        request.post(
          {
            rejectUnauthorized: false,
            url: "https://trackapi.thailandpost.co.th/post/api/v1/track",
            headers: {
              "Content-Type": "application/json",
              authorization: `Token ${token}`
            },
            body: JSON.stringify({
              status: "all",
              language: "TH",
              barcode: [trackingnumber]
            })
          },
          (error, response, body) => {
            let status = JSON.parse(body).response.items[trackingnumber].slice(-1)[0] ;
            pushToLine(
              userId,
               `หมายเลขติดตามพัสดุของคุณถูกต้อง เราจะแจ้งเตือนคุณเมื่อพัสดุเข้าสู่ขั้นตอนต่างๆ และขณะนี้ พัสดุของคุณอยู่ในสถานะ${status.status_description} ที่${status.location} ณ เวลา ${status.status_date}`,
               (error, response, body) => {
                 res.send('OK')
              }
            );
          }
        );
      } else {
         pushToLine(userId,"หมายเลขไม่ถูกต้อง",(error, response, body) => {
            res.send('OK')
         })
      }
    }
  );
});

app.listen(port);
