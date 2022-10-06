const express = require("express")
const {google} = require("googleapis")
const getTimetable = require("./scrapp.js")
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const moment = require('moment')

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const app = express()

app.use(bodyParser.json())
app.use(cookieParser())

// Setup your API client
let oauth2client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "http://localhost:5000/oauth2/redirect/google"
)

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

app.post("/auth/google", (req, res) => {

    const url = oauth2client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'online',

        // If you only need one scope you can pass it as a string
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/calendar'
        ]
    })

    res.send({url})
})

app.get("/oauth2/redirect/google", async (req, res) => {
    // get code from url
    const code = req.query.code
    console.log("google auth code -> ", code)
    // get access token
    oauth2client.getToken(code, (err, tokens) => {
        if (err) {
            console.log("error with getting token -> ", err)
        }
        console.log("tokens -> ", tokens)
        // const accessToken = tokens.access_token
        oauth2client.setCredentials(tokens)
        // const refreshToken = tokens.refresh_token

        res.cookie("isLoggedIn", true)
        res.redirect(`http://localhost:3000/`)
    })
})

app.post("/getTimetable", (req, res, next) => {
    try {
        getTimetable(req.body.login, req.body.password, req.body.semester)
            .then(timetable => {
                // console.log(timetable)
                res.send({timetable})
            })
    } catch (err) {
        next(err)
    }
})

app.post("/clearCalendar", (req, res, next) => {
    let calendar = google.calendar({
        version: "v3",
        auth: oauth2client
    })

    let counter = 0

    calendar.events.list({calendarId: req.body.calendarId})
        .then(r => {
            // console.log("r -> ", r)
            return r.data.items
        })
        .then(async events => {

            // delete all events
            for (let event of events) {
                await delay(25)
                await calendar.events.delete({
                    calendarId: req.body.calendarId,
                    eventId: event.id
                })
                    .then(() => console.log("deleted event ", ++counter, " -> ", event.id))
                    .catch(err => next(err))
            }

        })
        .then(() => {
            res.send("Calendar cleared, deleted " + counter + " events")
        })
        .catch(err => {
            next(err)
        })
})

app.post("/addEvents", async (req, res, next) => {
    let calendar = google.calendar({
        version: "v3",
        auth: oauth2client
    })

    let timeAhead = req.body.timeAhead
    let limitDate
    switch (timeAhead) {
        case 20:
            limitDate = moment().add(14)
            break
        case 40:
            limitDate = moment().add(60)
            break
        default:
            limitDate = null
    }

    let finalTimetable = []
    let timetable = req.body.timetable.timetable

    if (limitDate !== null) {
        timetable.forEach(event => {
            const eventDate = moment(event.start.dateTime)

            if (limitDate.diff(eventDate) > 0) {
                finalTimetable.push(event)
            }
        })
    } else {
        finalTimetable = timetable
    }

    let finalTimetableLength = finalTimetable.length
    let counter = 0

    let promiseArray = []

    for (const event of finalTimetable) {
        promiseArray.push(new Promise(async (resolve, reject) => {
            await delay(25)
            await calendar.events.insert({
                auth: oauth2client,
                calendarId: req.body.calendarId,
                resource: event,
            }, function (err, res) {
                if (err) {reject(err)}
                else {
                    console.log("created event ", ++counter, " of ", finalTimetableLength)
                    resolve(res)
                }

            })
        }))
    }

    await Promise.all(promiseArray)
        .catch(err => next(err))

    res.send("Created " + counter + " events")

})

app.get("/calendarList", (req, res, next) => {
    let calendar = google.calendar({
        version: "v3",
        auth: oauth2client
    })

    calendar.calendarList.list(
        (err, result) => {
            if (err) {return next(err)}
            return res.send(JSON.stringify(result))
        })

})

app.get("/userInfo", (req, res, next) => {
    let oauth2 = google.oauth2({
        auth: oauth2client,
        version: "v2"
    })

    oauth2.userinfo.get(
        (err, result) => {
            if (err) {return next(err)}
            return res.send(JSON.stringify(result))
        })
})


const hostname = 'localhost'
const port = process.env.PORT || 5000


app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`)
})