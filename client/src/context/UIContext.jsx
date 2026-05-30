import { createContext, useContext, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [conversationsPanelOpen,  setConversationsPanelOpen]  = useState(false)
  const [notificationPanelOpen,   setNotificationPanelOpen]   = useState(false)

  const toggleConversationsPanel  = () => setConversationsPanelOpen(v => !v)
  const closeConversationsPanel   = () => setConversationsPanelOpen(false)

  const toggleNotificationPanel   = () => setNotificationPanelOpen(v => !v)
  const closeNotificationPanel    = () => setNotificationPanelOpen(false)

  return (
    <UIContext.Provider value={{
      conversationsPanelOpen,
      toggleConversationsPanel,
      closeConversationsPanel,
      notificationPanelOpen,
      toggleNotificationPanel,
      closeNotificationPanel,
    }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  return useContext(UIContext)
}
