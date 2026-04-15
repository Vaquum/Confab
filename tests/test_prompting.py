import unittest

from confab.prompting import (
    build_attachment_prompt,
    build_doc_plus_context,
    build_doc_plus_model_prompt,
    build_document_user_prompt,
    build_pr_review_content,
    build_pr_review_prompt,
    build_synthesis_prompt,
    compact_patch,
    consensus_synthesis_prompt,
    default_doc_plus_profile,
    document_system_directive,
    extract_doc_plus_context,
    extract_doc_plus_user_prompt,
    normalize_doc_plus_profile,
    pr_synthesis_directive,
    wrap_doc_plus_prompt,
)


class PromptingTestCase(unittest.TestCase):
    def test_build_attachment_prompt_without_attachments_returns_raw_prompt(self):
        self.assertEqual(build_attachment_prompt('Hello', []), 'Hello')

    def test_build_attachment_prompt_with_text_and_attachments(self):
        self.assertEqual(
            build_attachment_prompt(
                'Hello',
                [{'name': 'notes.md', 'content': '# Notes'}],
            ),
            'Hello\n\n[ATTACHMENTS]\n\nAttachment: notes.md\n---\n# Notes',
        )

    def test_build_attachment_prompt_with_attachments_only(self):
        self.assertEqual(
            build_attachment_prompt(
                '',
                [{'name': 'notes.md', 'content': '# Notes'}],
            ),
            '[ATTACHMENTS]\n\nAttachment: notes.md\n---\n# Notes',
        )

    def test_document_system_directive_preserves_editor_role(self):
        directive = document_system_directive()
        self.assertIn('You are a document editor.', directive)
        self.assertIn('You MUST respond with valid JSON', directive)
        self.assertIn('"edits": [...]', directive)

    def test_build_document_user_prompt_without_document_returns_raw_prompt(self):
        self.assertEqual(build_document_user_prompt('Draft this'), 'Draft this')

    def test_build_document_user_prompt_with_document_wraps_request(self):
        self.assertEqual(
            build_document_user_prompt('Draft this', document='# Existing'),
            'Current document:\n\n# Existing\n\n---\n\nUser request: Draft this',
        )

    def test_normalize_doc_plus_profile_defaults_missing_values(self):
        profile = normalize_doc_plus_profile({'Evidential texture': 'A', 'Bad': 'C'})
        self.assertEqual(profile['Evidential texture'], 'A')
        self.assertEqual(profile['Rhetorical mode'], 'B')

    def test_default_doc_plus_profile_uses_b_for_every_attribute(self):
        profile = default_doc_plus_profile()
        self.assertTrue(profile)
        self.assertTrue(all(value == 'B' for value in profile.values()))

    def test_build_doc_plus_context_uses_profile_selections(self):
        context = build_doc_plus_context({'Evidential texture': 'A'})
        self.assertIn('Use this profile for all document collaboration turns', context)
        self.assertIn('Meta:', context)
        self.assertIn('- Evidential texture: A: Evidence-heavy — data, examples, citations', context)
        self.assertIn('- Rhetorical mode: B: Expository — explaining and informing', context)

    def test_doc_plus_wrap_and_extract_round_trip(self):
        wrapped = wrap_doc_plus_prompt('Profile', 'Draft this')
        self.assertEqual(extract_doc_plus_context(wrapped), 'Profile')
        self.assertEqual(extract_doc_plus_user_prompt(wrapped), 'Draft this')

    def test_build_doc_plus_model_prompt(self):
        self.assertEqual(
            build_doc_plus_model_prompt('Profile', 'Draft this'),
            'Profile\n\nUser request: Draft this',
        )

    def test_compact_patch_keeps_changed_lines_and_hunks(self):
        patch = '\n'.join([
            '@@ -1,3 +1,3 @@',
            ' unchanged',
            '-old',
            '+new',
        ])
        self.assertEqual(compact_patch(patch), '@@ -1,3 +1,3 @@\n-old\n+new')

    def test_build_pr_review_content(self):
        content = build_pr_review_content(
            title='Example PR',
            body=None,
            author='alice',
            base_branch='main',
            head_branch='feature',
            files=[
                {
                    'filename': 'app.py',
                    'status': 'modified',
                    'additions': 1,
                    'deletions': 1,
                    'patch': '@@ -1 +1 @@\n-old\n+new',
                },
            ],
        )
        self.assertIn('# Pull Request: Example PR', content)
        self.assertIn('**Author:** alice', content)
        self.assertIn('## Description\n(No description)', content)
        self.assertIn('```diff\n@@ -1 +1 @@\n-old\n+new\n```', content)

    def test_build_pr_review_prompt_prepends_directive(self):
        pr_content = '# Pull Request: Example'
        prompt = build_pr_review_prompt(pr_content)
        self.assertTrue(prompt.startswith('You are a technical auditor reviewing a pull request.'))
        self.assertTrue(prompt.endswith(pr_content))

    def test_build_synthesis_prompt_for_consensus(self):
        prompt = build_synthesis_prompt(
            'Question',
            {
                'claude': 'A1',
                'gpt': 'B1',
                'grok': 'C1',
                'gemini': 'D1',
            },
        )
        self.assertIn('Reviewer A:\nA1', prompt)
        self.assertIn('Reviewer D:\nD1', prompt)
        self.assertTrue(prompt.endswith(consensus_synthesis_prompt()))

    def test_build_synthesis_prompt_for_pr(self):
        prompt = build_synthesis_prompt(
            'Question',
            {
                'claude': 'A1',
                'gpt': 'B1',
                'grok': 'C1',
                'gemini': 'D1',
            },
            mode='pr',
        )
        self.assertTrue(prompt.endswith(pr_synthesis_directive()))


if __name__ == '__main__':
    unittest.main()
