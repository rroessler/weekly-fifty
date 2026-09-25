/// Vendor Modules
import z from 'myzod';

/// Package Modules
import { Question, Quiz } from '../types';

/** Handles Fetching Quizzes. */
export async function Fetch(options: Fetch.Options = {}) {
    // resolve the potential options to be used
    const { url, parse } = Fetch.Options(options);

    // attempt attempt fetching then parsing now
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { active: true } })
    }).then(parse);
}

/** The baseline quiz URL. */
export function URL() {
    return 'https://us-central1-weeklyfifty-7617b.cloudfunctions.net';
}

//  NAMESPACES  //

export namespace URL {
    //  PUBLIC METHODS  //

    /** The latest quiz URL. */
    export const Latest = () => `${URL()}/getQuizForViewer`;
}

export namespace Fetch {
    //  TYPEDEFS  //

    /** Available Fetch Options. */
    export interface Options {
        /** Overridable endpoint for quizzes. */
        readonly url?: string;

        /** Handles parsing incoming quizzes. */
        readonly parse?: (response: Response) => Quiz | Promise<Quiz>;
    }

    //  PROPERTIES  //

    /** Handles parsing timestamps. */
    const m_timestamp = z.union([
        z.date(),
        z
            .object({ _seconds: z.required(z.number()), _nanoseconds: z.required(z.number()) }, { allowUnknown: true })
            .map(({ _seconds, _nanoseconds }) => new Date(_seconds * 1e3 + _nanoseconds / 1e6))
    ] as const);

    /** Handles parsing questions. */
    const m_question = z
        .object({ question: z.required(z.string()), answer: z.required(z.string()) }, { allowUnknown: true })
        .map(({ question, answer }): Question => ({ title: question, answer }));

    /** Handles parsing quizzes. */
    const m_quiz = z
        .object(
            {
                quizId: z.required(z.number()),
                quizType: z.required(z.number()),
                quizTitle: z.required(z.string()),

                notesAbove: z.required(z.string()),
                notesBelow: z.required(z.string()),

                creationTime: z.required(m_timestamp),
                deploymentDate: z.required(m_timestamp),
                questions: z.required(z.array(m_question))
            },
            { allowUnknown: true }
        )
        .map(
            (api): Quiz => ({
                id: api.quizId,
                type: api.quizType,
                title: api.quizTitle,

                questions: api.questions,
                creation: api.creationTime,
                deployment: api.deploymentDate,
                notes: { above: api.notesAbove, below: api.notesBelow }
            })
        );

    //  PUBLIC METHODS  //

    /**
     * Handles resolving options to be used.
     * @param options                   Options to resolve.
     */
    export const Options = (options: Options = {}): Required<Options> => ({
        url: URL.Latest(),
        parse: m_parse,
        ...options
    });

    //  PRIVATE METHODS  //

    /**
     * Handles parsing incoming quiz responses.
     * @param response                  Quiz response.
     */
    const m_parse = async (response: Response) => {
        // validate the incoming content-type
        const ct = response.headers.get('content-type');

        // validate the content-type as JSON now
        if (ct && ct.indexOf('application/json') === -1) throw new TypeError('Expected JSON response');

        // handle validating the incoming data now
        return response.json().then((data) => m_quiz.parse(data.result.quiz));
    };
}
