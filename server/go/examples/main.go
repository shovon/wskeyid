package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	mathrand "math/rand"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/shovon/go/wskeyid"
	"github.com/shovon/go/wskeyid/messages/clientmessage"
	"github.com/shovon/go/wskeyid/messages/servermessages"
	"github.com/shovon/gorillawswrapper"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func randInt(max int) int {
	return int(mathrand.Float32() * float32(max))
}

func main() {
	router := mux.NewRouter()

	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		file, err := os.ReadFile("./index.html")
		if err != nil {
			w.WriteHeader(500)
			w.Write([]byte("Failed to read HTML file"))
			return
		}
		w.WriteHeader(200)
		w.Write(file)
	})

	router.HandleFunc("/path", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("New connection from client")
		defer fmt.Println("Connection closed")

		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer c.Close()

		{
			err := wskeyid.HandleAuthConnection(r, c)
			if err != nil {
				return
			}
		}

		conn := gorillawswrapper.NewWrapper(c)
		defer conn.Stop()

		clientId := strings.TrimSpace(r.URL.Query().Get("client_id"))

		go func() {
			for !conn.HasStopped() {
				<-time.After(time.Second * time.Duration(randInt(10)))
				err := conn.WriteJSON(servermessages.Message{Type: "TEXT_MESSAGE", Data: "Cool"})
				if err != nil {
					return
				}
			}
		}()

		for msg := range conn.MessagesChannel() {
			var m clientmessage.Message
			json.Unmarshal(msg.Message, &m)
			if m.Type != "TEXT_MESSAGE" {
				fmt.Printf("Got message of %s from %s", m.Type, clientId)
				continue
			}
			var str string
			err := m.UnmarshalData(&str)
			if err != nil {
				fmt.Printf("Failed to get message body")
			} else {
				fmt.Printf("Got message from client %s: %s", clientId, str)
			}
		}

		fmt.Println("Client closed the connection. Ending the connection")
	})

	fmt.Println("Server listening on port 8000")
	panic(http.ListenAndServe(":8000", router))
}
