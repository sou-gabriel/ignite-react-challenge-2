import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const storeCartProductsInLocalStorage = (cartProducts: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartProducts))
  }

  const isSomeCartProduct = (productId: number) =>
    cart.some(product => product.id === productId)

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      const cartProduct = cart.find(product => product.id === productId)

      if (cartProduct) {
        const thereIsNoMoreSpaceInTheProductStock =
          stock.amount <= cartProduct.amount

        if (thereIsNoMoreSpaceInTheProductStock) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }
      }

      const { data: product } = await api.get<Product>(`/products/${productId}`)

      if (product) {
        if (isSomeCartProduct(productId)) {
          const increaseProductAmountInCart = (carProducts: Product[]) => {
            return carProducts.map(carProduct =>
              carProduct.id === productId
                ? { ...carProduct, amount: carProduct.amount + 1 }
                : carProduct
            )
          }

          setCart(prevProducts => {
            const updatedProductAmount =
              increaseProductAmountInCart(prevProducts)
            storeCartProductsInLocalStorage(updatedProductAmount)

            return updatedProductAmount
          })
          return
        }

        setCart(prevProducts => {
          const newProduct = { ...product, amount: 1 }
          const updatedCarProducts = [...prevProducts, newProduct]

          storeCartProductsInLocalStorage(updatedCarProducts)

          return updatedCarProducts
        })
      }
    } catch {
      toast.error('Erro na adi????o do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      if (!isSomeCartProduct(productId)) {
        throw Error
      }

      setCart(prevProducts => {
        const filteredProductsFromCart = prevProducts.filter(
          prevProduct => prevProduct.id !== productId
        )
        storeCartProductsInLocalStorage(filteredProductsFromCart)
        return filteredProductsFromCart
      })
    } catch {
      toast.error('Erro na remo????o do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const isAnInvalidAmount = amount <= 0

      if (isAnInvalidAmount) {
        return
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      const cartProduct = cart.find(product => product.id === productId)

      if (cartProduct) {
        if (amount > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }
      }

      setCart(prevProducts => {
        const updatedCartProducts = prevProducts.map(prevProduct => {
          return prevProduct.id === productId
            ? { ...prevProduct, amount }
            : prevProduct
        })

        storeCartProductsInLocalStorage(updatedCartProducts)

        return updatedCartProducts
      })
    } catch {
      toast.error('Erro na altera????o de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
