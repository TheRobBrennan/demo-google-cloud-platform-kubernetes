const app = require("express")()
const port = process.env.PORT || 8000

app.get("/", (req, res) => {
  console.log(`GET /`)
  res.status(200).json({ message: "Hello world!" })
})

app.listen(port, () => console.log("Server is listening on port", port))

module.exports.app = app
