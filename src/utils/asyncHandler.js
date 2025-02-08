const asyncHanlder = (requestHanlder) =>{
    (req, res, next) => {
        Promise.resolve(requestHanlder(req, res, next)).catch((err) => next(err))
    }
}

export {asyncHanlder}

// const asyncHanlder = () =>{}
// const asyncHanlder = (func) => () =>{}
// const asyncHanlder = (func) => async() =>{}

/* Wraper Function using try catch*/
// const asyncHanlder = (fn) => async(req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message,
//         })
//     }
// }