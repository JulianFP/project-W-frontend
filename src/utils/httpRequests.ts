import { alerts, authHeader, loggedIn } from "./stores";

export type ErrorType =
	| "serverConfig"
	| "email"
	| "password"
	| "invalidRequest"
	| "permission"
	| "auth"
	| "notInDatabase"
	| "operation";

export type JobStep =
	| "notReported" //this is not an actual step returned by the backend but a value that I internally assign if the backend doesn't return anything
	| "aborting" //this also only exists internally and is used to show an animation while the backend aborts a job
	| "failed"
	| "notQueued"
	| "pendingRunner"
	| "runnerAssigned"
	| "runnerInProgress"
	| "success"
	| "downloaded";

export type JobStatus = {
	step?: JobStep;
	runner?: number;
	progress?: number;
};

export type Job = {
	jobId?: number;
	fileName?: string;
	model?: string;
	language?: string;
	error_msg?: string;
	status?: JobStatus;
};

type BackendResponseJson = {
	msg: string;
	errorType?: ErrorType;
	transcript?: string;
	jobId?: number;
	jobIds?: number[];
	jobs?: Job[];
	allowedEmailDomains?: string[];
	email?: string;
	isAdmin?: boolean;
	activated?: boolean;
	accessToken?: string;
};

//the following parameters are not part of the json response object but will be added to the final returnObj
export type BackendResponse = {
	ok: boolean;
	status: number;
} & BackendResponseJson;

export async function get(
	route: string,
	args: Record<string, string> = {},
	headers: Record<string, string> = {},
): Promise<BackendResponse> {
	const argsObj: URLSearchParams = new URLSearchParams(args);

	let returnObj: BackendResponse;

	try {
		const response: Response = await fetch(
			`${
				import.meta.env.VITE_BACKEND_BASE_URL
			}/api/${route}?${argsObj.toString()}`,
			{
				method: "GET",
				headers: headers,
			},
		);
		const contentType = response.headers.get("content-type");
		if (!contentType || !contentType.includes("application/json")) {
			returnObj = {
				ok: false,
				status: response.status,
				msg: `Response not in JSON format. HTTP status code ${response.status.toString()}`,
			};
		} else {
			const responseContent: BackendResponseJson = await response.json();
			if (responseContent.msg == null) {
				returnObj = {
					ok: false,
					msg: `msg field missing from response json object. HTTP status code ${response.status.toString()}`,
					status: response.status,
				};
			} else {
				returnObj = {
					ok: response.ok,
					status: response.status,
					...responseContent,
				};
			}
		}
	} catch (error) {
		returnObj = {
			ok: false,
			status: 404,
			msg: error.message,
		};
	}

	//401: Token expired, 422: Token was invalidated
	if (returnObj.status === 401) {
		authHeader.forgetToken();
		alerts.add(`You have been logged out: ${returnObj.msg}`, "red");
	} else if (
		returnObj.status === 422 &&
		returnObj.msg === "Signature verification failed"
	) {
		authHeader.forgetToken();
		alerts.add("You have been logged out: Token was invalidated", "red");
	}
	return returnObj;
}

export async function getLoggedIn(
	route: string,
	args: Record<string, string> = {},
): Promise<BackendResponse> {
	let loggedInVal = false;
	const loggedInUnsubscribe = loggedIn.subscribe((value: boolean) => {
		loggedInVal = value;
	});
	let authHeaderVal: Record<string, string> = {};
	const authHeaderUnsubscribe = authHeader.subscribe(
		(value: Record<string, string>) => {
			authHeaderVal = value;
		},
	);

	let returnObj: BackendResponse;
	if (loggedInVal) returnObj = await get(route, args, authHeaderVal);
	else
		returnObj = {
			ok: false,
			status: 401,
			msg: "not logged in",
		};

	loggedInUnsubscribe();
	authHeaderUnsubscribe();
	return returnObj;
}

export async function post(
	route: string,
	form: Record<string, string | File> = {},
	headers: Record<string, string> = {},
): Promise<BackendResponse> {
	const formObj: FormData = new FormData();
	for (const key in form) {
		formObj.set(key, form[key]);
	}

	let returnObj: BackendResponse;

	try {
		const response: Response = await fetch(
			`${import.meta.env.VITE_BACKEND_BASE_URL}/api/${route}`,
			{
				method: "POST",
				body: formObj,
				headers: headers,
			},
		);

		const contentType = response.headers.get("content-type");

		//catch http 413 error to display an understandable error message to user
		if (response.status === 413) {
			returnObj = {
				ok: false,
				status: 413,
				msg: "Submitted file is too large. Please only submit files that are smaller than 1GB.",
			};
		} else if (!contentType || !contentType.includes("application/json")) {
			returnObj = {
				ok: false,
				status: response.status,
				msg: `Response not in JSON format. HTTP status code ${response.status.toString()}`,
			};
		} else {
			const responseContent: BackendResponseJson = await response.json();
			if (responseContent.msg == null) {
				returnObj = {
					ok: false,
					msg: `msg field missing from response json object. HTTP status code ${response.status.toString()}`,
					status: response.status,
				};
			} else {
				returnObj = {
					ok: response.ok,
					status: response.status,
					...responseContent,
				};
			}
		}
	} catch (error) {
		returnObj = {
			ok: false,
			status: 404,
			msg: error.message,
		};
	}

	//401: Token expired, 422: Token was invalidated
	if (returnObj.status === 401) {
		authHeader.forgetToken();
		alerts.add(`You have been logged out: ${returnObj.msg}`, "red");
	} else if (
		returnObj.status === 422 &&
		returnObj.msg === "Signature verification failed"
	) {
		authHeader.forgetToken();
		alerts.add("You have been logged out: Token was invalidated", "red");
	}
	return returnObj;
}

export async function postLoggedIn(
	route: string,
	form: Record<string, string | File> = {},
): Promise<BackendResponse> {
	let loggedInVal = false;
	const loggedInUnsubscribe = loggedIn.subscribe((value: boolean) => {
		loggedInVal = value;
	});
	let authHeaderVal: Record<string, string> = {};
	const authHeaderUnsubscribe = authHeader.subscribe(
		(value: Record<string, string>) => {
			authHeaderVal = value;
		},
	);

	let returnObj: BackendResponse;
	if (loggedInVal) returnObj = await post(route, form, authHeaderVal);
	else
		returnObj = {
			ok: false,
			status: 401,
			msg: "not logged in",
		};

	loggedInUnsubscribe();
	authHeaderUnsubscribe();
	return returnObj;
}
