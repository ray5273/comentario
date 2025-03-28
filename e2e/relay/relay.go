package main

import (
	"log"
	"net/http"
	"net/url"
)

/*
  This is an HTTP relay to facilitate access in the CI pipeline, transparently relaying requests from localhost:8000 to
  comentario-test-site container. Thanks to this, we can configure Comentario to render comments on localhost:8000 for
  running it locally.
*/

import (
	"flag"
	"io"
)

// Hop-by-hop headers. These are removed when sent to the backend.
// http://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html
var hopHeaders = []string{
	"Connection",
	"Keep-Alive",
	"Proxy-Authenticate",
	"Proxy-Authorization",
	"Te", // canonicalized version of "TE"
	"Trailers",
	"Transfer-Encoding",
	"Upgrade",
}

func copyHeader(dst, src http.Header) {
	for k, vv := range src {
		for _, v := range vv {
			dst.Add(k, v)
		}
	}
}

func delHopHeaders(header http.Header) {
	for _, h := range hopHeaders {
		header.Del(h)
	}
}

type proxy struct {
	target *url.URL
}

func (p *proxy) ServeHTTP(wr http.ResponseWriter, req *http.Request) {
	log.Printf("-> %s %s %v\n", req.RemoteAddr, req.Method, req.URL)

	req.URL.Scheme = p.target.Scheme
	req.URL.Host = p.target.Host
	req.RequestURI = ""
	delHopHeaders(req.Header)

	log.Printf("-- forwarding to %v", req.URL)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(wr, "Server Error", http.StatusInternalServerError)
		log.Printf("ERROR: fetching: %v", err)
	}
	//goland:noinspection GoUnhandledErrorResult
	defer resp.Body.Close()

	log.Printf("<- %s %v\n", req.RemoteAddr, resp.Status)

	delHopHeaders(resp.Header)

	copyHeader(wr.Header(), resp.Header)
	wr.WriteHeader(resp.StatusCode)
	//goland:noinspection GoUnhandledErrorResult
	io.Copy(wr, resp.Body)
}

func main() {
	addrListen := flag.String("listen", "127.0.0.1:8080", "interface to listen on")
	target := flag.String("target", "", "target server URL")
	flag.Parse()

	// Parse target URL
	if *target == "" {
		log.Fatal("Missing target URL")
	}
	targetURL, err := url.Parse(*target)
	if err != nil {
		log.Fatalf("Invalid target URL: %v", err)
	}

	handler := &proxy{target: targetURL}

	log.Printf("Starting relay server on %s, target is %s\n", *addrListen, *target)
	if err := http.ListenAndServe(*addrListen, handler); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
