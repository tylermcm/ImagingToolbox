export type SkySurveyOption = 'color' | 'red' | 'blue' | 'grayscale'

export interface SkySurveyConfig {
  option: SkySurveyOption
  label: string
  surveyId: string
  colormap: 'native' | 'grayscale'
}

export const DEFAULT_SKY_SURVEY_OPTION: SkySurveyOption = 'color'

export const SKY_SURVEY_OPTIONS: SkySurveyConfig[] = [
  {
    option: 'color',
    label: 'DSS2 color',
    surveyId: 'P/DSS2/color',
    colormap: 'native',
  },
  {
    option: 'red',
    label: 'DSS2 red',
    surveyId: 'P/DSS2/red',
    colormap: 'native',
  },
  {
    option: 'blue',
    label: 'DSS2 blue',
    surveyId: 'P/DSS2/blue',
    colormap: 'native',
  },
  {
    option: 'grayscale',
    label: 'DSS2 grayscale',
    surveyId: 'P/DSS2/color',
    colormap: 'grayscale',
  },
]

export function getSkySurveyConfig(option: SkySurveyOption): SkySurveyConfig {
  return SKY_SURVEY_OPTIONS.find((entry) => entry.option === option) ?? SKY_SURVEY_OPTIONS[0]
}
