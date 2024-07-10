import { Utils } from './utils';

export class HttpClientError {
    constructor(
        readonly status: number,
        readonly message: string,
        readonly response: any,
    ) {}
}

export type HttpHeaders = Record<string, string>;

export class HttpClient {

    constructor(
        /** Base API URL. */
        readonly baseUrl: string,
        /** Callback executed before an HTTP request is run. */
        private readonly onBeforeRequest?: () => void,
        /** Callback executed in a case of a failed HTTP request. */
        private readonly onError?: (error: any) => void,
    ) {}

    /**
     * Run an HTTP DELETE request to the given endpoint.
     * @param path Endpoint path, relative to the client's baseURl.
     * @param body Optional request body.
     * @param headers Optional additional headers.
     */
    delete<T>(path: string, body?: any, headers?: HttpHeaders): Promise<T> {
        return this.request<T>('DELETE', path, body, headers);
    }

    /**
     * Run an HTTP GET request to the given endpoint.
     * @param path Endpoint path, relative to the client's baseURl.
     * @param headers Optional additional headers.
     */
    get<T>(path: string, headers?: HttpHeaders): Promise<T> {
        return this.request<T>('GET', path, undefined, headers);
    }

    /**
     * Run an HTTP POST request to the given endpoint.
     * @param path Endpoint path, relative to the client's baseURl.
     * @param body Optional request body.
     * @param headers Optional additional headers.
     */
    post<T>(path: string, body?: any, headers?: HttpHeaders): Promise<T> {
        return this.request<T>('POST', path, body, headers);
    }

    /**
     * Run an HTTP PUT request to the given endpoint.
     * @param path Endpoint path, relative to the client's baseURl.
     * @param body Optional request body.
     * @param headers Optional additional headers.
     */
    put<T>(path: string, body?: any, headers?: HttpHeaders): Promise<T> {
        return this.request<T>('PUT', path, body, headers);
    }

    /**
     * Convert the relative endpoint path to an absolute one by prepending it with the base URL.
     * @param path Relative endpoint path.
     */
    private getEndpointUrl(path: string): string {
        return Utils.joinUrl(this.baseUrl, path);
    }

    private request<T>(method: 'DELETE' | 'GET' | 'POST' | 'PUT', path: string, body?: any, headers?: HttpHeaders): Promise<T> {
        // Run the before callback, if any
        this.onBeforeRequest?.();

        // Run the request
        return new Promise((resolve, reject) => {
            try {
                // Prepare an XMLHttpRequest
                const req = new XMLHttpRequest();
                req.open(method, this.getEndpointUrl(path), true);
                if (body) {
                    req.setRequestHeader('Content-type', 'application/json');
                }

                // Add necessary headers
                if (headers) {
                    Object.entries(headers).forEach(([k, v]) => req.setRequestHeader(k, v as string));
                }

                // Resolve or reject the promise on load, based on the return status
                const handleError = () => {
                    const e = new HttpClientError(req.status, req.statusText, req.response);
                    // Run the error callback, if any
                    this.onError?.(e);
                    // Reject the promise
                    reject(e);
                };

                // Set up the request callbacks
                req.onload = () => {
                    // Only statuses 200..299 are considered successful
                    if (req.status < 200 || req.status > 299) {
                        handleError();

                    // If there's any response available, parse it as JSON
                    } else if (req.response) {
                        resolve(JSON.parse(req.response));

                    // Resolve with an empty object otherwise
                    } else {
                        resolve(undefined as T);
                    }
                };
                req.onerror = handleError;

                // Allow sending cookies along with the request
                req.withCredentials = true;

                // Run the request
                req.send(body ? JSON.stringify(body) : undefined);

            } catch (e) {
                // Run the error callback, if any
                this.onError?.(e);
                // Reject the promise on any failure
                reject(e);
            }
        });
    }
}
