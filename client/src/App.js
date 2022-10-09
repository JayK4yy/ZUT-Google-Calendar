import {useEffect, useState} from "react"
import {Button, Form} from "react-bootstrap"
import {CustomSlider} from "./CustomSlider"
import classNames from 'classnames'
import axios from 'axios'


function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [calendarsArray, setCalendarsArray] = useState([])
    const [calendarID, setCalendarID] = useState()
    const [progress, setProgress] = useState({value: 0, desc: "", color: "info"})
    const [userInfo, setUserInfo] = useState({
        family_name: "",
        given_name: "",
        id: "",
        locale: "",
        name: "",
        picture: ""
    })

    useEffect(() => {
        let isLoggedInCookie = document.cookie === "isLoggedIn=true"
        setIsLoggedIn(isLoggedInCookie)

        if (isLoggedInCookie) {
            getUserInfo()
            getMyGoogleCalendarsList()
        }
    }, [])

    let host = document.location.host;
    let react_api;

    if (host.includes("localhost")) {
        react_api = "http://localhost:5000/"
    } else {
        react_api = "https://" + host;
    }

    const _axios = axios.create({
        baseURL: react_api,
        headers: {
            'Content-Type': 'application/json'
        }
    })

    const handleGoogleLogin = async () => {
        try {
            _axios.post("/auth/google")
                .then(res => {
                    window.location.href = res.data.url
                })
        } catch (error) {
            console.log(error)
        }
    }

    const logout = () => {
        setIsLoggedIn(false)
        document.cookie = "isLoggedIn= ; expires = Thu, 01 Jan 1970 00:00:00 GMT"
        window.location.reload()
    }

    const getMyGoogleCalendarsList = () => {
        if (calendarsArray.length === 0) {
            _axios.get("/calendarList")
                .then(result => {
                    result.data.data.items.forEach(item => {
                        const tempItem = {
                            label: item.primary === true ? "Kalendarz główny" : item.summary,
                            value: item.id
                        }
                        setCalendarsArray(prevState => [...prevState, tempItem])
                    })
                })
                .catch(err => {
                    console.log(err)
                    logout()
                })
        }
    }

    const getUserInfo = () => {
        _axios.get("/userInfo")
            .then(result => {
                // console.log(result.data)
                setUserInfo(result.data.data)
            })
            .catch(err => {
                console.log(err)
                logout()
            })
    }

    const marks = [
        {
            // 2 weeks
            value: 20,
            label: '2t',
        },
        {
            // 2 months
            value: 40,
            label: '2m',
        },
        {
            // current semester
            value: 60,
            label: 's+0',
        },
        {
            // next semester
            value: 80,
            label: 's+1',
        },
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        let elements = e.target.elements
        // console.log(elements)
        let form = {
            calendarId: calendarID,
            timeAhead: parseInt(elements[1].value),
            login: elements[2].value,
            password: elements[3].value
        }

        setProgress({value: 30, desc: "czyszczenie kalendarza...", color: "info"})
        _axios.post("/clearCalendar", {
            calendarId: form.calendarId,
            timeAhead: form.timeAhead
        })
            .then(() => {
                setProgress({value: 60, desc: "pobieranie kalendarza ZUT...", color: "info"})

                _axios.post("/getTimetable", {
                    login: form.login,
                    password: form.password,
                    semester: form.timeAhead
                })
                    .then(timetable => {
                        // console.log("timetable -> ", timetable)
                        if (timetable.data.error) {
                            throw timetable.data.error
                        } else {

                            setProgress({value: 90, desc: "wpisywanie planu do Google...", color: "info"})

                            _axios.post("/addEvents", {
                                timeAhead: form.timeAhead,
                                timetable: timetable.data,
                                calendarId: form.calendarId
                            })
                                .then(res => {
                                    if (res.status === 200) {
                                        setProgress({value: 100, desc: "Gotowe! 😅", color: "success"})
                                    } else {
                                        setProgress({
                                            value: 100,
                                            desc: "Wystąpił błąd podczas wpisywania planu",
                                            color: "danger"
                                        })
                                    }
                                    // console.log(res)
                                })
                                .catch(err => {
                                    setProgress({
                                        value: 100,
                                        desc: "Wystąpił błąd podczas wpisywania planu",
                                        color: "danger"
                                    })
                                    console.log(err)
                                })
                        }
                    })
                    .catch(err => {
                        setProgress({value: 100, desc: "Wystąpił błąd podczas logowania do eDziekanatu, spróbuj ponownie...", color: "danger"})
                        console.log(err)
                    })
            })
            .catch(err => {
                setProgress({value: 100, desc: "Wystąpił błąd podczas czyszczenia kalendarza", color: "danger"})
                console.log(err)
            })


    }

    // className="progress w-100 mb-4"

    const progressClassNames = classNames([
        'progress',
        'mb-4',
        progress.value > 0 ? 'w-100' : 'hide-progress-bar'
    ])

    const progressBarClassNames = classNames([
        'progress-bar',
        progress.value < 100 && 'progress-bar-striped progress-bar-animated',
        `bg-${progress.color}`,
    ])

    return (
        <div className="App">

            <div className={"container text-center mt-3 mt-lg-5"}>

                {isLoggedIn
                    ? (
                        <div className={"d-flex flex-row align-items-center justify-content-between w-100 px-4 my-4"}>
                            <div className={"d-flex flex-row align-items-center"}>
                                {userInfo.id !== "" ? (
                                    <>
                                        <img
                                            src={userInfo.picture}
                                            alt={"Profile picture"}
                                            id={"profileImage"}
                                            width={60}/>
                                        <h5 className={"ms-3 mt-2 d-none d-sm-block"}>Witaj, {userInfo.given_name}</h5>
                                    </>
                                    ) : (
                                    <>
                                        <div id={"profileImage"} style={{width: "60px", height: "60px"}}></div>
                                        <h5 className={"ms-3 mt-2 d-none d-sm-block"}>Witaj, ...</h5>
                                    </>
                                )}

                            </div>
                            <Button
                                variant={"outline-light"}
                                onClick={logout}
                                className={"py-2 px-4"}>
                                Wyloguj
                            </Button>
                        </div>
                    )
                    : (
                        <Button
                            variant={"light"}
                            onClick={handleGoogleLogin}
                            className={"py-2 px-4 my-4 wide-btn"}>
                            <i className="bi bi-google me-2"></i>Zaloguj się z Google
                        </Button>
                    )}


                <p id={"title"} className={"fs-3"}>
                    Importuj plan zajęć ZUT <br/>
                    do swojego kalendarza Google
                </p>

                <Form className={"mt-3 text-center w-100 px-4"} onSubmit={handleSubmit}>
                    <Form.Group controlId={"calendar"} className={"mb-3"}>
                        <Form.Label>Kalendarz Google</Form.Label>
                        <Form.Select
                            onChange={(e) => {
                                setCalendarID(e.target.options[e.target.selectedIndex].dataset.id)
                            }}
                            className={"form-control"}
                            disabled={!isLoggedIn}>
                            {calendarsArray.map((item, index) => {
                                return <option key={index} data-id={item.value}>{item.label}</option>
                            })}
                        </Form.Select>
                        <Form.Text>Wybierz kalendarz do którego chcesz zaimportować plan zajęć.<br/>
                        <b className={"blinking"}>Uwaga!!!</b> Nie wybieraj ważnego kalendarza, ponieważ program usuwa wszystkie wydarzenia!<br/>
                        Najlepiej stwórz osobny kalendarz, na przykład "Plan ZUT".</Form.Text>
                    </Form.Group>

                    <Form.Group controlId={"timeAhead"} className={"mb-3"}>
                        <Form.Label>Przedział czasu</Form.Label>
                        <CustomSlider
                            defaultValue={40}
                            step={null}
                            marks={marks}
                        />
                        <Form.Text>Wybierz okres czasu wprzód z jakiego ma zostać pobrany plan.<br/>
                            <b>2t</b> → 2 tygodnie | <b>2m</b> → 2 miesiące | <b>s+0</b> → semestr bieżący
                            | <b>s+1</b> → semestr kolejny</Form.Text>
                    </Form.Group>

                    <Form.Group controlId={"login"} className={"mb-3"}>
                        <Form.Label>Login ZUT</Form.Label>
                        <Form.Control type={"text"} disabled={!isLoggedIn}/>
                    </Form.Group>

                    <Form.Group controlId={"password"} className={"mb-4"}>
                        <Form.Label>Hasło ZUT</Form.Label>
                        <Form.Control type={"password"} disabled={!isLoggedIn}/>
                    </Form.Group>

                    <Button
                        variant="light"
                        type="submit"
                        id={"sendBtn"}
                        className={"mb-4 wide-btn"}
                        disabled={!isLoggedIn}>
                        Pobierz plan zajęć
                    </Button>

                    <div className={progressClassNames}>
                        <div
                            className={progressBarClassNames}
                            role="progressbar"
                            style={{width: progress.value + "%"}}>
                            {progress.desc}
                        </div>
                    </div>

                </Form>


            </div>

        </div>
    )
}

export default App
