"""Doc+ prompt schema and builders."""

from copy import deepcopy

DOC_PLUS_LEVELS = [
    {
        'id': 'meta',
        'label': 'Meta',
        'attributes': [
            {
                'name': 'Evidential texture',
                'choices': {
                    'A': 'Evidence-heavy — data, examples, citations',
                    'B': 'Selective — evidence at key moments',
                    'C': 'Assertion-driven — claims on authority or bare statement',
                },
            },
            {
                'name': 'Rhetorical mode',
                'choices': {
                    'A': 'Argumentative — making a case',
                    'B': 'Expository — explaining and informing',
                    'C': 'Narrative — telling a story',
                },
            },
            {
                'name': 'Temporal orientation',
                'choices': {
                    'A': 'Past — retrospective, historical',
                    'B': 'Present — current state, what is',
                    'C': 'Future — projective, what will or should be',
                },
            },
            {
                'name': 'Reflexivity',
                'choices': {
                    'A': 'Transparent — regularly acknowledges its own structure',
                    'B': 'Occasional — signposts at key moments only',
                    'C': 'Invisible — never breaks the fourth wall',
                },
            },
        ],
    },
    {
        'id': 'whole',
        'label': 'Whole',
        'attributes': [
            {
                'name': 'Implied reader',
                'choices': {
                    'A': 'Expert — assumes deep familiarity',
                    'B': 'Informed — knows the basics, needs the argument',
                    'C': 'Newcomer — assumes little, explains as it goes',
                },
            },
            {
                'name': 'Conceptual framing',
                'choices': {
                    'A': 'Single frame — one governing metaphor throughout',
                    'B': 'Light framing — occasional metaphor, not structural',
                    'C': 'No frame — subject treated on its own terms',
                },
            },
            {
                'name': 'Connective texture',
                'choices': {
                    'A': 'Explicit — transitions stated clearly',
                    'B': 'Selective — signposts at key turns only',
                    'C': 'Implicit — ideas placed, reader infers the link',
                },
            },
            {
                'name': 'Arc',
                'choices': {
                    'A': 'Linear — builds in one direction',
                    'B': 'Thematic — organized by topic, not sequence',
                    'C': 'Circular — returns to where it started, transformed',
                },
            },
            {
                'name': 'Tonal arc',
                'choices': {
                    'A': 'Flat — same emotional temperature throughout',
                    'B': 'Gradual — slow, deliberate shifts',
                    'C': 'Dynamic — intentional swings in emotional register',
                },
            },
            {
                'name': 'Voice unity',
                'choices': {
                    'A': 'Singular — unmistakably one mind',
                    'B': 'Consistent — cohesive but not distinctive',
                    'C': 'Composite — multiple contributors felt, but aligned',
                },
            },
        ],
    },
    {
        'id': 'section',
        'label': 'Section',
        'attributes': [
            {
                'name': 'Section weight',
                'choices': {
                    'A': 'Uniform — sections roughly equal in space',
                    'B': 'Proportional — weighted to importance',
                    'C': 'Concentrated — most weight in one or two sections',
                },
            },
            {
                'name': 'Section sequencing',
                'choices': {
                    'A': 'Linear — chronological or causal chain',
                    'B': 'Modular — self-contained, in logical order',
                    'C': 'Associative — thematic or lateral connections',
                },
            },
            {
                'name': 'Inter-section transition',
                'choices': {
                    'A': 'Explicit — bridging passages between sections',
                    'B': 'Signposted — brief markers at boundaries',
                    'C': 'Hard cut — white space, no verbal bridge',
                },
            },
            {
                'name': 'Internal arc',
                'choices': {
                    'A': 'Shaped — each section builds to something',
                    'B': 'Mixed — some sections shaped, some flat',
                    'C': 'Flat — sections deliver information evenly',
                },
            },
            {
                'name': 'Functional role',
                'choices': {
                    'A': 'Differentiated — each section has a clear, distinct job',
                    'B': 'Semi-differentiated — roles mostly clear',
                    'C': 'Uniform — sections serve similar functions throughout',
                },
            },
        ],
    },
    {
        'id': 'paragraph',
        'label': 'Paragraph',
        'attributes': [
            {
                'name': 'Idea density',
                'choices': {
                    'A': 'Sparse — one idea, fully developed',
                    'B': 'Moderate — one or two, with room',
                    'C': 'Dense — multiple ideas, tightly packed',
                },
            },
            {
                'name': 'Abstraction level',
                'choices': {
                    'A': 'Concrete — stays in specifics and examples',
                    'B': 'Blended — moves between both',
                    'C': 'Abstract — lives in concepts and generalizations',
                },
            },
            {
                'name': 'Internal structure',
                'choices': {
                    'A': 'Top-loaded — point first, then development',
                    'B': 'Mixed — varies by paragraph',
                    'C': 'Bottom-loaded — builds to the point',
                },
            },
            {
                'name': 'Paragraph length',
                'choices': {
                    'A': 'Short — two to three sentences',
                    'B': 'Medium — four to six sentences',
                    'C': 'Long — seven or more, sustained development',
                },
            },
            {
                'name': 'Cohesion',
                'choices': {
                    'A': 'Chained — each sentence picks up the last',
                    'B': 'Loose — connected but not sequential',
                    'C': 'Parallel — sentences stand side by side',
                },
            },
        ],
    },
    {
        'id': 'sentence',
        'label': 'Sentence',
        'attributes': [
            {
                'name': 'Rhythm',
                'choices': {
                    'A': 'Short and percussive',
                    'B': 'Varied — mixes short and long',
                    'C': 'Long and flowing',
                },
            },
            {
                'name': 'Syntactic complexity',
                'choices': {
                    'A': 'Linear — one clause, one idea',
                    'B': 'Moderate — occasional subordination',
                    'C': 'Nested — layered, recursive constructions',
                },
            },
            {
                'name': 'Information order',
                'choices': {
                    'A': 'Point first — then qualify',
                    'B': 'Mixed — varies by context',
                    'C': 'Point last — build up, then deliver',
                },
            },
            {
                'name': 'Agency',
                'choices': {
                    'A': 'Human — people do things',
                    'B': 'Mixed — depends on emphasis',
                    'C': 'Abstract — systems, processes, forces act',
                },
            },
            {
                'name': 'Epistemic stance',
                'choices': {
                    'A': 'Assertive — states directly',
                    'B': 'Measured — qualifies where appropriate',
                    'C': 'Hedged — careful, provisional throughout',
                },
            },
        ],
    },
    {
        'id': 'word',
        'label': 'Word',
        'attributes': [
            {
                'name': 'Economy',
                'choices': {
                    'A': 'Spare — every word earns its place',
                    'B': 'Balanced — occasional looseness tolerated',
                    'C': 'Expansive — room to breathe, repeat, elaborate',
                },
            },
            {
                'name': 'Precision',
                'choices': {
                    'A': 'Exacting — the only right word',
                    'B': 'Adequate — close enough to land',
                    'C': 'Suggestive — deliberately open, letting the reader fill in',
                },
            },
            {
                'name': 'Lexical complexity',
                'choices': {
                    'A': 'Plain — simplest word every time',
                    'B': 'Mixed — plain default, specialist where needed',
                    'C': 'Specialized — assumes reader speaks the domain',
                },
            },
            {
                'name': 'Connotative consistency',
                'choices': {
                    'A': 'Warm — word choices carry positive charge',
                    'B': 'Neutral — words chosen for meaning, not feeling',
                    'C': 'Cool — detached, clinical, or critical charge',
                },
            },
            {
                'name': 'Register',
                'choices': {
                    'A': 'Informal — conversational, relaxed',
                    'B': 'Mid — professional but not stiff',
                    'C': 'Formal — elevated, institutional',
                },
            },
        ],
    },
]


def doc_plus_context_header() -> str:
    """Return the stored doc+ context marker."""
    return '[DOC_PLUS_CONTEXT]'


def doc_plus_context_footer() -> str:
    """Return the stored doc+ context closing marker."""
    return '[/DOC_PLUS_CONTEXT]'


def doc_plus_user_prompt_header() -> str:
    """Return the stored doc+ user prompt marker."""
    return '[DOC_PLUS_USER_PROMPT]'


def doc_plus_background() -> str:
    """Return the doc+ background directive."""
    return """A document's reader experience is shaped by attributes operating at six levels: four structural levels of scale (word, sentence, paragraph, section, whole), and one meta level that cuts across all of them. This framework identifies 30 attributes — each independently adjustable, each pinned to a spectrum of A, B, or C. It is not a complete theory of reader cognition; reader experience is also shaped by who the reader is and how they encounter the text. But as a practical system for designing and diagnosing consistency across documents, these 30 attributes are sufficient. Coherence comes from choosing a position on each and holding it, or shifting only with purpose. Drift — unintentional movement along any of these spectrums — is what makes a document feel wrong.

Attribute	Level	A	B	C
Evidential texture	Meta	Evidence-heavy — data, examples, citations	Selective — evidence at key moments	Assertion-driven — claims on authority or bare statement
Rhetorical mode	Meta	Argumentative — making a case	Expository — explaining and informing	Narrative — telling a story
Temporal orientation	Meta	Past — retrospective, historical	Present — current state, what is	Future — projective, what will or should be
Reflexivity	Meta	Transparent — regularly acknowledges its own structure	Occasional — signposts at key moments only	Invisible — never breaks the fourth wall
Economy	Word	Spare — every word earns its place	Balanced — occasional looseness tolerated	Expansive — room to breathe, repeat, elaborate
Precision	Word	Exacting — the only right word	Adequate — close enough to land	Suggestive — deliberately open, letting the reader fill in
Lexical complexity	Word	Plain — simplest word every time	Mixed — plain default, specialist where needed	Specialized — assumes reader speaks the domain
Connotative consistency	Word	Warm — word choices carry positive charge	Neutral — words chosen for meaning, not feeling	Cool — detached, clinical, or critical charge
Register	Word	Informal — conversational, relaxed	Mid — professional but not stiff	Formal — elevated, institutional
Rhythm	Sentence	Short and percussive	Varied — mixes short and long	Long and flowing
Syntactic complexity	Sentence	Linear — one clause, one idea	Moderate — occasional subordination	Nested — layered, recursive constructions
Information order	Sentence	Point first — then qualify	Mixed — varies by context	Point last — build up, then deliver
Agency	Sentence	Human — people do things	Mixed — depends on emphasis	Abstract — systems, processes, forces act
Epistemic stance	Sentence	Assertive — states directly	Measured — qualifies where appropriate	Hedged — careful, provisional throughout
Idea density	Paragraph	Sparse — one idea, fully developed	Moderate — one or two, with room	Dense — multiple ideas, tightly packed
Abstraction level	Paragraph	Concrete — stays in specifics and examples	Blended — moves between both	Abstract — lives in concepts and generalizations
Internal structure	Paragraph	Top-loaded — point first, then development	Mixed — varies by paragraph	Bottom-loaded — builds to the point
Paragraph length	Paragraph	Short — two to three sentences	Medium — four to six sentences	Long — seven or more, sustained development
Cohesion	Paragraph	Chained — each sentence picks up the last	Loose — connected but not sequential	Parallel — sentences stand side by side
Section weight	Section	Uniform — sections roughly equal in space	Proportional — weighted to importance	Concentrated — most weight in one or two sections
Section sequencing	Section	Linear — chronological or causal chain	Modular — self-contained, in logical order	Associative — thematic or lateral connections
Inter-section transition	Section	Explicit — bridging passages between sections	Signposted — brief markers at boundaries	Hard cut — white space, no verbal bridge
Internal arc	Section	Shaped — each section builds to something	Mixed — some sections shaped, some flat	Flat — sections deliver information evenly
Functional role	Section	Differentiated — each section has a clear, distinct job	Semi-differentiated — roles mostly clear	Uniform — sections serve similar functions throughout
Implied reader	Whole	Expert — assumes deep familiarity	Informed — knows the basics, needs the argument	Newcomer — assumes little, explains as it goes
Conceptual framing	Whole	Single frame — one governing metaphor throughout	Light framing — occasional metaphor, not structural	No frame — subject treated on its own terms
Connective texture	Whole	Explicit — transitions stated clearly	Selective — signposts at key turns only	Implicit — ideas placed, reader infers the link
Arc	Whole	Linear — builds in one direction	Thematic — organized by topic, not sequence	Circular — returns to where it started, transformed
Tonal arc	Whole	Flat — same emotional temperature throughout	Gradual — slow, deliberate shifts	Dynamic — intentional swings in emotional register
Voice unity	Whole	Singular — unmistakably one mind	Consistent — cohesive but not distinctive	Composite — multiple contributors felt, but aligned"""


def doc_plus_levels() -> list[dict]:
    """Return a copy of the doc+ level schema."""
    return deepcopy(DOC_PLUS_LEVELS)


def default_doc_plus_profile() -> dict[str, str]:
    """Return the default doc+ profile selections."""
    return {
        attribute['name']: 'B'
        for level in DOC_PLUS_LEVELS
        for attribute in level['attributes']
    }


def normalize_doc_plus_profile(candidate: dict | None) -> dict[str, str]:
    """Normalize doc+ profile selections to known attributes and A/B/C values."""
    defaults = default_doc_plus_profile()
    if not isinstance(candidate, dict):
        return defaults
    normalized = defaults.copy()
    for attribute in defaults:
        value = candidate.get(attribute)
        if value in {'A', 'B', 'C'}:
            normalized[attribute] = value
    return normalized


def build_doc_plus_context(profile: dict | None) -> str:
    """Build the doc+ profile context string sent to the model."""
    normalized = normalize_doc_plus_profile(profile)
    lines = [
        doc_plus_background(),
        '',
        'Use this profile for all document collaboration turns in this conversation.',
        '',
        'Selected profile:',
    ]
    for level in DOC_PLUS_LEVELS:
        lines.append(f"{level['label']}:")
        for attribute in level['attributes']:
            choice = normalized[attribute['name']]
            lines.append(
                f"- {attribute['name']}: {choice}: {attribute['choices'][choice]}"
            )
        lines.append('')
    return '\n'.join(lines).strip()


def build_doc_plus_model_prompt(context: str, user_prompt: str) -> str:
    """Build the model-facing doc+ prompt."""
    return f'{context.strip()}\n\nUser request: {user_prompt.strip()}'


def wrap_doc_plus_prompt(context: str, user_prompt: str) -> str:
    """Wrap stored doc+ prompt text with internal markers."""
    return (
        f'{doc_plus_context_header()}\n'
        f'{context.strip()}\n'
        f'{doc_plus_context_footer()}\n'
        f'{doc_plus_user_prompt_header()}\n'
        f'{user_prompt.strip()}'
    )


def extract_doc_plus_context(prompt: str | None) -> str | None:
    """Extract the stored doc+ profile context from a prompt."""
    if not prompt:
        return None
    start = prompt.find(doc_plus_context_header())
    end = prompt.find(doc_plus_context_footer())
    if start == -1 or end == -1 or end <= start:
        return None
    context = prompt[start + len(doc_plus_context_header()):end].strip()
    if not context:
        return None
    return context


def extract_doc_plus_user_prompt(prompt: str | None) -> str:
    """Extract the visible user prompt from a stored doc+ prompt."""
    if not prompt:
        return ''
    header = doc_plus_user_prompt_header()
    if header not in prompt:
        return prompt
    user_prompt = prompt.split(header, maxsplit=1)[1].strip()
    if not user_prompt:
        return ''
    return user_prompt


def build_doc_plus_prompting_config() -> dict[str, list[dict]]:
    """Return doc+ schema config needed by the frontend wizard."""
    return {
        'levels': doc_plus_levels(),
    }
