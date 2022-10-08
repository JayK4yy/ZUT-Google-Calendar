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

const getTimeBetween = (timeAhead) => {
    let timeMin, timeMax

    switch (timeAhead) {
        case 20:
            // 2 tygodnie
            timeMin = moment().set({hour:0,minute:0,second:0,millisecond:0})
            timeMax = moment()
                .add(2, 'weeks')
                .set({hour: 0, minute: 0, second: 0, millisecond: 0})
            break
        case 40:
            // 2 miesiące
            timeMin = moment().set({hour:0,minute:0,second:0,millisecond:0})
            timeMax = moment()
                .add(2, 'months')
                .set({hour: 0, minute: 0, second: 0, millisecond: 0})
            break
    }

    return [timeMin, timeMax]
}

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
    // console.log("google auth code -> ", code)
    // get access token
    oauth2client.getToken(code, (err, tokens) => {
        if (err) {
            console.log("error with getting token -> ", err)
        }
        // console.log("tokens -> ", tokens)
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
                res.send(timetable)
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

    const [timeMin, timeMax] = getTimeBetween(req.body.timeAhead)

    calendar.events.list({
        calendarId: req.body.calendarId,
        maxResults: 1000,
        timeMin: timeMin ? timeMin.format() : undefined,
        timeMax: timeMax ? timeMax.format() : undefined
    })
        .then(r => {
            // console.log("r -> ", r)
            return r.data.items
        })
        .then(async events => {

            // delete all events
            for (let event of events) {
                await delay(10)
                await calendar.events.delete({
                    calendarId: req.body.calendarId,
                    eventId: event.id
                })
                    .then(() => console.log("deleted event ", ++counter, " -> ", event.id))
                    .catch(err => next(err))
            }

        })
        .then(() => {
            res.json({
                message: "Calendar cleared, deleted " + counter + " events",
                timeMin: timeMin,
                timeMax: timeMax
            })
        })
        .catch(err => {
            next(err)
        })
})

app.post("/addEvents", (req, res, next) => {
    let calendar = google.calendar({
        version: "v3",
        auth: oauth2client
    })

    const promise = new Promise((resolve, _) => {
        const [timeMin, timeMax] = getTimeBetween(req.body.timeAhead)

        let finalTimetable = []
        let timetable = req.body.timetable

        if (timeMin && timeMax) {
            timetable.forEach(event => {
                const eventDate = moment(event.start.dateTime)

                if (timeMax.diff(eventDate) > 0 && eventDate.diff(timeMin) > 0) {
                    finalTimetable.push(event)
                }
            })
        } else {
            finalTimetable = timetable
        }

        resolve(finalTimetable)
    })

    let counter = 0

    promise
        .then(async timetable => {
            for (let event of timetable) {
                await delay(10)
                await calendar.events.insert({
                    auth: oauth2client,
                    calendarId: req.body.calendarId,
                    resource: event,
                })
                    .then(() => console.log("created event ", ++counter, " of ", timetable.length))
                    .catch(err => console.log(err))
            }
        })
        .then(() => {
            res.send("Created " + counter + " events")
        })
        .catch(err => {
            next(err)
        })

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