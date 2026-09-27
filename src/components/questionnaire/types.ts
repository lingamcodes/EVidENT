export type QuestionType = 'short' | 'mc' | 'check';

export type QuestionOption = { id: string; label: string };

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  hasPhoto: boolean;
};

export const questionTypes: { key: QuestionType; label: string }[] = [
  { key: 'short', label: 'Short text' },
  { key: 'mc', label: 'Multiple choice' },
  { key: 'check', label: 'Checkbox' },
];

let seq = 0;
/** Local-only ids for list keys; replaced by database ids once questions are saved. */
export const localId = () => `local-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const newOption = (label: string): QuestionOption => ({ id: localId(), label });

export const newQuestion = (
  text = 'New question',
  type: QuestionType = 'mc',
  options: string[] = ['Option 1'],
): Question => ({ id: localId(), text, type, options: options.map(newOption), hasPhoto: false });

/** Starter questions from the design. */
export const defaultQuestions = (): Question[] => [
  newQuestion('Dietary restrictions', 'mc', ['Vegetarian', 'Halal', 'Allergies', 'Nil']),
  newQuestion('Shirt size', 'mc', ['S', 'M', 'L', 'XL']),
];

export const isAllergyOption = (label: string) => /allerg/i.test(label);
