declare module 'swagger-ui-react' {
  import { ComponentType } from 'react'
  
  interface SwaggerUIProps {
    url?: string
    spec?: object
    deepLinking?: boolean
    tryItOutEnabled?: boolean
    supportedSubmitMethods?: string[]
    [key: string]: any
  }
  
  const SwaggerUI: ComponentType<SwaggerUIProps>
  export default SwaggerUI
}