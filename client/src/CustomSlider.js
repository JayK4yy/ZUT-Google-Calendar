import {styled} from "@mui/material";
import Slider from "@mui/material/Slider";

const CustomSlider = styled(Slider)({
    color: 'rgba(0,0,0,0.25)',
    height: 42.5,
    paddingTop: 0,
    paddingBottom: "38px",
    borderRadius: 100,
    marginTop: -20,
    marginBottom: -25,
    '& .MuiSlider-track': {
        border: 'none',
    },
    '& .MuiSlider-thumb': {
        height: 40,
        width: 40,
        // backgroundColor: '#fff',
        background: "none",
        border: '3px solid rgba(255,255,255,0.5)',
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
            boxShadow: 'inherit',
        },
        '&:before': {
            display: 'none',
        },
    },
    '& .MuiSlider-markLabel': {
        fontSize: 15,
        color: '#ffffff',
        paddingBottom: "10px"
    },
});

export {CustomSlider}


